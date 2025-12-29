import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, FileText } from "lucide-react";
import { useCardInvoices, Invoice } from "@/hooks/useCardInvoices";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface InvoicesListProps {
  cardId: string;
  houseId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getStatusBadge = (status: Invoice["status"]) => {
  switch (status) {
    case "current":
      return (
        <Badge variant="default" className="bg-primary text-primary-foreground">
          Atual
        </Badge>
      );
    case "future":
      return (
        <Badge variant="secondary">
          Futura
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Fechada
        </Badge>
      );
  }
};

export function InvoicesList({ cardId, houseId }: InvoicesListProps) {
  const navigate = useNavigate();
  const { invoices, isLoading } = useCardInvoices({ cardId, houseId });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Nenhuma fatura encontrada</p>
        <p className="text-sm mt-1">
          Importe uma fatura para começar a visualizar suas transações.
        </p>
      </div>
    );
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    navigate(`/cards/${cardId}/invoice/${invoice.key}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Faturas
        </h3>
        <span className="text-sm text-muted-foreground">
          {invoices.length} {invoices.length === 1 ? "fatura" : "faturas"}
        </span>
      </div>

      <div className="space-y-2">
        {invoices.map((invoice) => (
          <button
            key={invoice.key}
            onClick={() => handleInvoiceClick(invoice)}
            className="w-full bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground capitalize">
                  {invoice.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {invoice.count} {invoice.count === 1 ? "transação" : "transações"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatCurrency(invoice.total)}
                </p>
                {getStatusBadge(invoice.status)}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
