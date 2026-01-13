import { useState } from "react";
import { AlertTriangle, Check, X, Calendar, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface PossibleDuplicate {
  transaction: {
    description: string;
    date: string;
    amount: number;
    installment: string | null;
    category: string;
  };
  existingMatch: {
    description: string;
    amount: number;
    transaction_date: string;
  };
  similarity: number;
}

interface DuplicateReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: PossibleDuplicate[];
  onApprove: (approved: PossibleDuplicate["transaction"][]) => Promise<boolean>;
  onDiscardAll: () => void;
  isLoading?: boolean;
}

export function DuplicateReviewDialog({
  open,
  onOpenChange,
  duplicates,
  onApprove,
  onDiscardAll,
  isLoading = false,
}: DuplicateReviewDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === duplicates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(duplicates.map((_, i) => i)));
    }
  };

  const handleApprove = async () => {
    const approvedTransactions = duplicates
      .filter((_, index) => selected.has(index))
      .map((d) => d.transaction);
    await onApprove(approvedTransactions);
    setSelected(new Set());
  };

  const handleDiscard = () => {
    setSelected(new Set());
    onDiscardAll();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Possíveis Duplicatas Encontradas
          </DialogTitle>
          <DialogDescription>
            Encontramos {duplicates.length} transações que podem ser duplicatas.
            Revise e selecione as que deseja importar mesmo assim.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2 border-b">
          <Checkbox
            id="select-all"
            checked={selected.size === duplicates.length && duplicates.length > 0}
            onCheckedChange={toggleAll}
          />
          <label
            htmlFor="select-all"
            className="text-sm font-medium cursor-pointer"
          >
            Selecionar todas
          </label>
        </div>

        <ScrollArea className="flex-1 max-h-[400px] pr-4">
          <div className="space-y-3 py-2">
            {duplicates.map((duplicate, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selected.has(index)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => toggleItem(index)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(index)}
                    onCheckedChange={() => toggleItem(index)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    {/* Transaction from file */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-medium text-foreground truncate">
                        {duplicate.transaction.description}
                      </span>
                      <span className="text-destructive font-semibold whitespace-nowrap">
                        {formatCurrency(duplicate.transaction.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(duplicate.transaction.date)}
                      </span>
                      {duplicate.transaction.installment && (
                        <Badge variant="outline" className="text-xs">
                          {duplicate.transaction.installment}
                        </Badge>
                      )}
                    </div>

                    {/* Similar to */}
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500 mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="font-medium">
                          {Math.round(duplicate.similarity * 100)}% similar a:
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        "{duplicate.existingMatch.description}" • {formatDate(duplicate.existingMatch.transaction_date)} • {formatCurrency(duplicate.existingMatch.amount)}
                      </div>
                    </div>

                    {/* Hint */}
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      💡 Pode ser uma compra diferente no mesmo dia (ex: pedágio)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isLoading}
            className="sm:flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Descartar Todas
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isLoading || selected.size === 0}
            className="sm:flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Importar {selected.size > 0 ? `${selected.size} Selecionadas` : "Selecionadas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
