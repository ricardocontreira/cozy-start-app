import { ArrowDownUp, Filter, Receipt } from "lucide-react";
import { useCardTransactions } from "@/hooks/useCardTransactions";
import { TransactionItem } from "@/components/TransactionItem";
import { TransactionSummary } from "@/components/TransactionSummary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionsListProps {
  cardId: string;
  houseId: string;
}

export function TransactionsList({ cardId, houseId }: TransactionsListProps) {
  const {
    transactions,
    summary,
    categories,
    isLoading,
    categoryFilter,
    sortField,
    sortOrder,
    filterByCategory,
    sortBy,
  } = useCardTransactions({ cardId, houseId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (summary.count === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h4 className="font-medium text-foreground mb-1">
          Nenhuma transação encontrada
        </h4>
        <p className="text-sm text-muted-foreground">
          Importe uma fatura para ver suas transações aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Transações
        </h3>
        <span className="text-sm text-muted-foreground">
          {transactions.length} de {summary.count}
        </span>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-2">
        {/* Category Filter */}
        <Select
          value={categoryFilter || "all"}
          onValueChange={(value) => filterByCategory(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort buttons */}
        <Button
          variant={sortField === "date" ? "secondary" : "outline"}
          size="sm"
          onClick={() => sortBy("date")}
          className="gap-1"
        >
          <ArrowDownUp className="w-4 h-4" />
          Data
          {sortField === "date" && (
            <span className="text-xs">({sortOrder === "desc" ? "↓" : "↑"})</span>
          )}
        </Button>

        <Button
          variant={sortField === "amount" ? "secondary" : "outline"}
          size="sm"
          onClick={() => sortBy("amount")}
          className="gap-1"
        >
          <ArrowDownUp className="w-4 h-4" />
          Valor
          {sortField === "amount" && (
            <span className="text-xs">({sortOrder === "desc" ? "↓" : "↑"})</span>
          )}
        </Button>
      </div>

      {/* Summary */}
      <TransactionSummary summary={summary} />

      {/* Transactions List */}
      <div className="divide-y divide-border rounded-lg border bg-card">
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}
