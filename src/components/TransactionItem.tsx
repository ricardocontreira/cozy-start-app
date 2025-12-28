import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "@/hooks/useCardTransactions";

interface TransactionItemProps {
  transaction: Transaction;
}

// Category colors mapping
const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  "Alimentação": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", icon: "🍔" },
  "Transporte": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: "🚗" },
  "Compras": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: "🛒" },
  "Saúde": { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: "💊" },
  "Lazer": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", icon: "🎮" },
  "Serviços": { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", icon: "⚙️" },
  "Assinaturas": { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", icon: "📺" },
  "Educação": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400", icon: "📚" },
  "Moradia": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", icon: "🏠" },
  "Não classificado": { bg: "bg-muted", text: "text-muted-foreground", icon: "❓" },
};

function getCategoryStyle(category: string | null) {
  const cat = category || "Não classificado";
  return categoryColors[cat] || categoryColors["Não classificado"];
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const categoryStyle = getCategoryStyle(transaction.category);
  const formattedDate = format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
    locale: ptBR,
  });
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(transaction.amount);

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Category icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${categoryStyle.bg}`}
        >
          {categoryStyle.icon}
        </div>

        {/* Transaction details */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">
            {transaction.description}
          </p>
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
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0 ml-4">
        <p className="font-semibold text-foreground">{formattedAmount}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}
        >
          {transaction.category || "Não classificado"}
        </span>
      </div>
    </div>
  );
}
