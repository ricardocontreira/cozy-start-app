import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Loader2, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUploadTransactions, UploadTransaction } from "@/hooks/useUploadTransactions";
import { getCategoryStyle } from "@/lib/categories";
import { UploadLog } from "@/hooks/useInvoiceUpload";

interface UploadTransactionsSheetProps {
  upload: UploadLog | null;
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  houseId: string;
  onTransactionDeleted?: () => void;
}

export function UploadTransactionsSheet({
  upload,
  isOpen,
  onClose,
  isOwner,
  houseId,
  onTransactionDeleted,
}: UploadTransactionsSheetProps) {
  const { transactions, isLoading, isDeleting, deleteTransaction } = useUploadTransactions({
    uploadId: upload?.id || null,
    houseId,
  });

  const handleDelete = async (transactionId: string) => {
    const success = await deleteTransaction(transactionId);
    if (success && onTransactionDeleted) {
      onTransactionDeleted();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Itens Importados
          </SheetTitle>
          <SheetDescription className="text-left">
            {upload?.filename}
            <span className="block text-xs mt-1">
              {transactions.length} {transactions.length === 1 ? "transação" : "transações"}
            </span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Todas as transações foram removidas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  isOwner={isOwner}
                  isDeleting={isDeleting === transaction.id}
                  onDelete={() => handleDelete(transaction.id)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface TransactionItemProps {
  transaction: UploadTransaction;
  isOwner: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  formatCurrency: (value: number) => string;
}

function TransactionItem({
  transaction,
  isOwner,
  isDeleting,
  onDelete,
  formatCurrency,
}: TransactionItemProps) {
  const categoryStyle = getCategoryStyle(transaction.category);

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="text-lg flex-shrink-0">{categoryStyle.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{transaction.description}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className="text-xs text-muted-foreground">
              {format(new Date(transaction.transaction_date + "T00:00:00"), "dd/MM/yyyy")}
            </span>
            {transaction.installment && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {transaction.installment}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 ${categoryStyle.bg} ${categoryStyle.text} border-0`}
            >
              {transaction.category || "Não classificado"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        <span className="text-sm font-semibold text-destructive whitespace-nowrap">
          {formatCurrency(transaction.amount)}
        </span>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover transação?</AlertDialogTitle>
                <AlertDialogDescription>
                  A transação "{transaction.description}" será permanentemente removida.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
