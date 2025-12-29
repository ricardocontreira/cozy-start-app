import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarClock, CreditCard, Pencil, Repeat } from "lucide-react";
import type { Transaction } from "@/hooks/useCardTransactions";
import type { EnrichedTransaction } from "@/hooks/useHouseTransactions";
import { CATEGORIES, getCategoryStyle } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditTransactionDialog } from "./EditTransactionDialog";

interface EditableTransactionItemProps {
  transaction: Transaction | EnrichedTransaction;
  onCategoryUpdated?: () => void;
}

// Type guard to check if transaction is enriched
function isEnrichedTransaction(
  txn: Transaction | EnrichedTransaction
): txn is EnrichedTransaction {
  return "billingMonth" in txn;
}

// Check if it's a projected transaction (not editable)
function isProjectedTransaction(txn: Transaction | EnrichedTransaction): boolean {
  return txn.id.includes("_projected_");
}

// Check if it's a card transaction (not editable - must use invoice upload)
function isCardTransaction(txn: Transaction | EnrichedTransaction): boolean {
  return !!txn.card_id;
}

// Check if it's a recurring transaction
function isRecurringTransaction(txn: Transaction | EnrichedTransaction): boolean {
  return !!(txn as any).recurrence_id;
}

export function EditableTransactionItem({
  transaction,
  onCategoryUpdated,
}: EditableTransactionItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const categoryStyle = getCategoryStyle(transaction.category);
  const formattedDate = format(
    new Date(transaction.transaction_date),
    "dd/MM/yyyy",
    { locale: ptBR }
  );
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(transaction.amount);

  const isEnriched = isEnrichedTransaction(transaction);
  const isDeferred = isEnriched && transaction.isDeferred;
  const isProjection = isEnriched && transaction.isProjection;
  const deferredMessage = isEnriched ? transaction.deferredMessage : undefined;
  const isFromCard = isCardTransaction(transaction);
  const isRecurring = isRecurringTransaction(transaction);
  const isFullyEditable = !isProjectedTransaction(transaction) && !isFromCard; // Can open edit dialog
  const isCategoryEditable = !isProjectedTransaction(transaction); // Can change category only

  const handleCategoryChange = async (newCategory: string) => {
    if (!isCategoryEditable) return;

    setIsUpdating(true);
    try {
      // Get the real transaction ID (without _projected_ suffix)
      const realId = transaction.id.split("_projected_")[0];

      const { error } = await supabase
        .from("transactions")
        .update({ category: newCategory })
        .eq("id", realId);

      if (error) throw error;

      toast({
        title: "Categoria atualizada",
        description: `Alterada para "${newCategory}"`,
      });

      setIsPopoverOpen(false);
      onCategoryUpdated?.();
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar a categoria.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Prepare transaction data for edit dialog
  const transactionForEdit = {
    id: transaction.id.split("_projected_")[0],
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    transaction_date: transaction.transaction_date,
    type: (transaction as any).type || "expense",
    recurrence_id: (transaction as any).recurrence_id || null,
  };

  return (
    <TooltipProvider>
      <div
        className={`flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors ${
          isProjection
            ? "opacity-70 border-l-2 border-blue-400 dark:border-blue-600"
            : ""
        } ${isFullyEditable ? "cursor-pointer" : ""}`}
        onClick={isFullyEditable ? () => setIsEditDialogOpen(true) : undefined}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Category icon */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${categoryStyle.bg}`}
          >
            {categoryStyle.icon}
          </div>

          {/* Transaction details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">
                {transaction.description}
              </p>
              {/* Projection badge */}
              {isProjection && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded shrink-0">
                      <CalendarClock className="w-3 h-3" />
                      Projeção
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Parcela futura - valor estimado</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Card transaction badge */}
              {isFromCard && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                      <CreditCard className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Transação de cartão - edite via upload de fatura</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Recurring badge */}
              {isRecurring && !isFromCard && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded shrink-0">
                      <Repeat className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Transação recorrente</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formattedDate}</span>
              {transaction.installment && (
                <>
                  <span>•</span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {transaction.installment}
                  </span>
                </>
              )}
            </div>
            {/* Deferred indicator */}
            {isDeferred && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Cobrada no próximo mês</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{deferredMessage}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Amount and Category */}
        <div className="text-right shrink-0 ml-4">
          <p className="font-semibold text-foreground">{formattedAmount}</p>

          {/* Editable category badge */}
          {isCategoryEditable ? (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all hover:ring-2 hover:ring-primary/30 ${categoryStyle.bg} ${categoryStyle.text}`}
                  disabled={isUpdating}
                  onClick={(e) => e.stopPropagation()} // Prevent opening edit dialog
                >
                  {transaction.category || "Não classificado"}
                  <Pencil className="w-3 h-3 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={transaction.category || "Não classificado"}
                  onValueChange={handleCategoryChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
          ) : (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}
            >
              {transaction.category || "Não classificado"}
            </span>
          )}
        </div>
      </div>

      {/* Edit Transaction Dialog */}
      {isFullyEditable && (
        <EditTransactionDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          transaction={transactionForEdit}
          onSuccess={onCategoryUpdated}
        />
      )}
    </TooltipProvider>
  );
}
