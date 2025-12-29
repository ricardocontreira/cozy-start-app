import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Repeat, Receipt } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useToast } from "@/hooks/use-toast";
import { getBillingMonth } from "@/lib/billingUtils";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const expenseSchema = z.object({
  description: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  category: z.string().min(1, "Selecione uma categoria"),
  transaction_date: z.date({ required_error: "Selecione uma data" }),
  card_id: z.string().optional(),
  expense_type: z.enum(["single", "recurring"]),
  duration_months: z.number().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedCardId?: string;
}

const DURATION_OPTIONS = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
  { value: 24, label: "24 meses" },
];

export function AddExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedCardId,
}: AddExpenseDialogProps) {
  const { user } = useAuth();
  const { currentHouse } = useHouse();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [cards, setCards] = useState<{ id: string; name: string; closing_day: number | null }[]>([]);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      transaction_date: new Date(),
      card_id: preselectedCardId || "",
      expense_type: "single",
      duration_months: 12,
    },
  });

  const expenseType = form.watch("expense_type");
  const selectedCardId = form.watch("card_id");

  // Fetch cards when dialog opens
  useEffect(() => {
    if (open && currentHouse?.id) {
      fetchCards();
    }
  }, [open, currentHouse?.id]);

  // Set preselected card when provided
  useEffect(() => {
    if (preselectedCardId) {
      form.setValue("card_id", preselectedCardId);
    }
  }, [preselectedCardId, form]);

  const fetchCards = async () => {
    if (!currentHouse?.id) return;
    const { data } = await supabase
      .from("credit_cards")
      .select("id, name, closing_day")
      .eq("house_id", currentHouse.id)
      .order("name");
    setCards(data || []);
  };

  const handleSubmit = async (data: ExpenseFormData) => {
    if (!currentHouse?.id || !user?.id) return;

    setSubmitting(true);

    try {
      const selectedCard = cards.find((c) => c.id === data.card_id);
      const closingDay = selectedCard?.closing_day || 20;

      if (data.expense_type === "single") {
        // Single expense
        const billingInfo = getBillingMonth(data.transaction_date, closingDay);

        const { error } = await supabase.from("transactions").insert({
          house_id: currentHouse.id,
          created_by: user.id,
          description: data.description,
          amount: data.amount,
          category: data.category,
          transaction_date: format(data.transaction_date, "yyyy-MM-dd"),
          billing_month: format(billingInfo.billingMonth, "yyyy-MM-01"),
          card_id: data.card_id || null,
          installment: null,
          type: "expense",
        });

        if (error) throw error;

        toast({
          title: "Despesa adicionada!",
          description: `${data.description} foi registrada.`,
        });
      } else {
        // Recurring expense - create multiple transactions
        const totalMonths = data.duration_months || 12;
        const baseBillingInfo = getBillingMonth(data.transaction_date, closingDay);

        const transactions = [];
        for (let i = 0; i < totalMonths; i++) {
          const billingMonth = addMonths(baseBillingInfo.billingMonth, i);
          const transactionDate = addMonths(data.transaction_date, i);

          transactions.push({
            house_id: currentHouse.id,
            created_by: user.id,
            description: data.description,
            amount: data.amount,
            category: data.category,
            transaction_date: format(transactionDate, "yyyy-MM-dd"),
            billing_month: format(billingMonth, "yyyy-MM-01"),
            card_id: data.card_id || null,
            installment: null,
            type: "expense",
          });
        }

        const { error } = await supabase.from("transactions").insert(transactions);

        if (error) throw error;

        toast({
          title: "Despesa recorrente criada!",
          description: `${totalMonths} transações foram registradas para "${data.description}".`,
        });
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Nova Despesa
          </DialogTitle>
          <DialogDescription>
            Adicione uma despesa única ou recorrente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Netflix, Aluguel, Mercado..."
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={form.watch("category")}
              onValueChange={(value) => form.setValue("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("transaction_date") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("transaction_date") ? (
                    format(form.watch("transaction_date"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("transaction_date")}
                  onSelect={(date) => date && form.setValue("transaction_date", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Card (optional) */}
          <div className="space-y-2">
            <Label>Cartão (opcional)</Label>
            <Select
              value={selectedCardId || "none"}
              onValueChange={(value) => form.setValue("card_id", value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum cartão</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expense Type */}
          <div className="space-y-3">
            <Label>Tipo de despesa</Label>
            <RadioGroup
              value={expenseType}
              onValueChange={(value) => form.setValue("expense_type", value as "single" | "recurring")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Única
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="recurring" />
                <Label htmlFor="recurring" className="font-normal cursor-pointer flex items-center gap-1">
                  <Repeat className="w-4 h-4" />
                  Recorrente
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Duration (only for recurring) */}
          {expenseType === "recurring" && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <Label>Duração</Label>
              <Select
                value={form.watch("duration_months")?.toString() || "12"}
                onValueChange={(value) => form.setValue("duration_months", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Serão criadas {form.watch("duration_months") || 12} transações mensais.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
