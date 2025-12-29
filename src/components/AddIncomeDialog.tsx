import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Repeat, TrendingUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useToast } from "@/hooks/use-toast";
import { INCOME_CATEGORIES } from "@/lib/categories";
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

const incomeSchema = z.object({
  description: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  category: z.string().min(1, "Selecione uma categoria"),
  transaction_date: z.date({ required_error: "Selecione uma data" }),
  income_type: z.enum(["single", "recurring"]),
  duration_months: z.number().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface AddIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DURATION_OPTIONS = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
  { value: 24, label: "24 meses" },
];

export function AddIncomeDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddIncomeDialogProps) {
  const { user } = useAuth();
  const { currentHouse } = useHouse();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      transaction_date: new Date(),
      income_type: "single",
      duration_months: 12,
    },
  });

  const incomeType = form.watch("income_type");

  const handleSubmit = async (data: IncomeFormData) => {
    if (!currentHouse?.id || !user?.id) return;

    setSubmitting(true);

    try {
      if (data.income_type === "single") {
        // Single income
        const { error } = await supabase.from("transactions").insert({
          house_id: currentHouse.id,
          created_by: user.id,
          description: data.description,
          amount: data.amount,
          category: data.category,
          transaction_date: format(data.transaction_date, "yyyy-MM-dd"),
          billing_month: format(data.transaction_date, "yyyy-MM-01"),
          card_id: null,
          installment: null,
          type: "income",
        });

        if (error) throw error;

        toast({
          title: "Receita adicionada!",
          description: `${data.description} foi registrada.`,
        });
      } else {
        // Recurring income - create multiple transactions with recurrence_id
        const totalMonths = data.duration_months || 12;
        const recurrenceId = crypto.randomUUID();

        const transactions = [];
        for (let i = 0; i < totalMonths; i++) {
          const transactionDate = addMonths(data.transaction_date, i);

          transactions.push({
            house_id: currentHouse.id,
            created_by: user.id,
            description: data.description,
            amount: data.amount,
            category: data.category,
            transaction_date: format(transactionDate, "yyyy-MM-dd"),
            billing_month: format(transactionDate, "yyyy-MM-01"),
            card_id: null,
            installment: null,
            type: "income",
            recurrence_id: recurrenceId,
          });
        }

        const { error } = await supabase.from("transactions").insert(transactions);

        if (error) throw error;

        toast({
          title: "Receita recorrente criada!",
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
            <TrendingUp className="w-5 h-5 text-success" />
            Nova Receita
          </DialogTitle>
          <DialogDescription>
            Adicione uma receita única ou recorrente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Freelance, Aluguel..."
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
                {INCOME_CATEGORIES.map((cat) => (
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

          {/* Income Type */}
          <div className="space-y-3">
            <Label>Tipo de receita</Label>
            <RadioGroup
              value={incomeType}
              onValueChange={(value) => form.setValue("income_type", value as "single" | "recurring")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="income-single" />
                <Label htmlFor="income-single" className="font-normal cursor-pointer">
                  Única
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="income-recurring" />
                <Label htmlFor="income-recurring" className="font-normal cursor-pointer flex items-center gap-1">
                  <Repeat className="w-4 h-4" />
                  Recorrente
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Duration (only for recurring) */}
          {incomeType === "recurring" && (
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
            <Button type="submit" disabled={submitting} className="bg-success hover:bg-success/90">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}