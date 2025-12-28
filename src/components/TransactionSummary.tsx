import type { TransactionSummary as Summary } from "@/hooks/useCardTransactions";

interface TransactionSummaryProps {
  summary: Summary;
}

// Category colors for the summary
const categoryColors: Record<string, string> = {
  "Alimentação": "bg-orange-500",
  "Transporte": "bg-blue-500",
  "Compras": "bg-purple-500",
  "Saúde": "bg-red-500",
  "Lazer": "bg-emerald-500",
  "Serviços": "bg-gray-500",
  "Assinaturas": "bg-indigo-500",
  "Educação": "bg-cyan-500",
  "Moradia": "bg-amber-500",
  "Não classificado": "bg-muted-foreground",
};

function getCategoryColor(category: string) {
  return categoryColors[category] || categoryColors["Não classificado"];
}

export function TransactionSummary({ summary }: TransactionSummaryProps) {
  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(summary.total);

  // Sort categories by total amount (descending)
  const sortedCategories = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5); // Show top 5 categories

  if (summary.count === 0) {
    return null;
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Resumo do Período
        </h4>
        <span className="text-xs text-muted-foreground">
          {summary.count} transações
        </span>
      </div>

      {/* Category bars */}
      <div className="space-y-2">
        {sortedCategories.map(([category, data]) => {
          const percentage = summary.total > 0 ? (data.total / summary.total) * 100 : 0;
          const formattedAmount = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(data.total);

          return (
            <div key={category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </span>
                  <span className="font-medium text-foreground">
                    {formattedAmount}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getCategoryColor(category)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="font-semibold text-foreground">Total</span>
        <span className="text-lg font-bold text-primary">{formattedTotal}</span>
      </div>
    </div>
  );
}
