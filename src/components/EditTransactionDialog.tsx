import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Pencil, Repeat } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
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
import { RecurrenceUpdateDialog, RecurrenceUpdateType } from "./RecurrenceUpdateDialog";

const transactionSchema = z.object({
  description: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  category: z.string().min(1, "Selecione uma categoria"),
  transaction_date: z.date({ required_error: "Selecione uma data" }),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionData {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  transaction_date: string;
  type: string;
  recurrence_id: string | null;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionData | null;
  onSuccess?: () => void;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: EditTransactionDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false);
  const [pendingData, setPendingData] = useState<TransactionFormData | null>(null);
  const [futureCount, setFutureCount] = useState(0);

  const isIncome = transaction?.type === "income";
  const categories = isIncome ? INCOME_CATEGORIES : CATEGORIES;
  const isRecurring = !!transaction?.recurrence_id;

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "",
      transaction_date: new Date(),
    },
  });

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && open) {
      form.reset({
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category || "",
        transaction_date: new Date(transaction.transaction_date),
      });
    }
  }, [transaction, open, form]);

  // Fetch future count for recurring transactions
  useEffect(() => {
    const fetchFutureCount = async () => {
      if (!transaction?.recurrence_id || !open) return;

      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("recurrence_id", transaction.recurrence_id)
        .gte("transaction_date", transaction.transaction_date);

      setFutureCount(count || 0);
    };

    fetchFutureCount();
  }, [transaction, open]);

  const handleSubmit = async (data: TransactionFormData) => {
    if (!transaction) return;

    // If recurring, show confirmation dialog
    if (isRecurring) {
      setPendingData(data);
      setShowRecurrenceDialog(true);
      return;
    }

    // Non-recurring: update directly
    await updateSingle(data);
  };

  const updateSingle = async (data: TransactionFormData) => {
    if (!transaction) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          description: data.description,
          amount: data.amount,
          category: data.category,
          transaction_date: format(data.transaction_date, "yyyy-MM-dd"),
        })
        .eq("id", transaction.id);

      if (error) throw error;

      toast({
        title: "Transação atualizada!",
        description: "As alterações foram salvas.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecurrenceConfirm = async (updateType: RecurrenceUpdateType) => {
    if (!transaction || !pendingData) return;

    setSubmitting(true);
    try {
      if (updateType === "single") {
        // Update only this transaction AND remove from recurrence group
        const { error } = await supabase
          .from("transactions")
          .update({
            description: pendingData.description,
            amount: pendingData.amount,
            category: pendingData.category,
            transaction_date: format(pendingData.transaction_date, "yyyy-MM-dd"),
            recurrence_id: null, // Remove from recurrence group
          })
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Transação atualizada!",
          description: "Esta transação foi atualizada e desvinculada da recorrência.",
        });
      } else {
        // Update this and all future transactions
        const { error } = await supabase
          .from("transactions")
          .update({
            description: pendingData.description,
            amount: pendingData.amount,
            category: pendingData.category,
          })
          .eq("recurrence_id", transaction.recurrence_id)
          .gte("transaction_date", transaction.transaction_date);

        if (error) throw error;

        toast({
          title: "Transações atualizadas!",
          description: `${futureCount} transações foram atualizadas.`,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setPendingData(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar {isIncome ? "Receita" : "Despesa"}
            </DialogTitle>
            <DialogDescription>
              Altere os dados da transação.
              {isRecurring && (
                <span className="flex items-center gap-1 mt-1 text-amber-600 dark:text-amber-400">
                  <Repeat className="w-3 h-3" />
                  Esta transação é recorrente
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
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
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
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
                  {categories.map((cat) => (
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

      <RecurrenceUpdateDialog
        open={showRecurrenceDialog}
        onOpenChange={setShowRecurrenceDialog}
        onConfirm={handleRecurrenceConfirm}
        futureCount={futureCount}
      />
    </>
  );
}
