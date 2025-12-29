import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Filter, ArrowUpDown } from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { EditableTransactionItem } from "@/components/EditableTransactionItem";
import { TransactionSummary } from "@/components/TransactionSummary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  category: string | null;
  installment: string | null;
  card_id: string | null;
  upload_id: string | null;
}

interface CardInfo {
  name: string;
  last_digits: string;
  color: string;
}

type SortField = "date" | "amount";
type SortOrder = "asc" | "desc";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function CardInvoiceDetails() {
  const { cardId, month } = useParams<{ cardId: string; month: string }>();
  const { user, loading: authLoading } = useAuth();
  const { currentHouse, loading: houseLoading } = useHouse();
  const navigate = useNavigate();

  const [card, setCard] = useState<CardInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!currentHouse || !cardId || !month) return;

    setLoading(true);
    try {
      // Fetch card info
      const { data: cardData, error: cardError } = await supabase
        .from("credit_cards")
        .select("name, last_digits, color")
        .eq("id", cardId)
        .eq("house_id", currentHouse.id)
        .maybeSingle();

      if (cardError) throw cardError;
      if (!cardData) {
        navigate("/cards");
        return;
      }
      setCard(cardData);

      // Fetch transactions for this billing month
      // billing_month is stored as a date, so we need to match the month
      const monthStart = `${month}-01`;
      const { data: txnData, error: txnError } = await supabase
        .from("transactions")
        .select("*")
        .eq("card_id", cardId)
        .eq("house_id", currentHouse.id)
        .gte("billing_month", monthStart)
        .lt("billing_month", getNextMonth(monthStart))
        .order("transaction_date", { ascending: false });

      if (txnError) throw txnError;
      setTransactions(txnData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentHouse, cardId, month, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...transactions];

    if (categoryFilter) {
      result = result.filter((txn) => txn.category === categoryFilter);
    }

    result.sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.transaction_date).getTime();
        const dateB = new Date(b.transaction_date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === "desc"
          ? Number(b.amount) - Number(a.amount)
          : Number(a.amount) - Number(b.amount);
      }
    });

    setFilteredTransactions(result);
  }, [transactions, categoryFilter, sortField, sortOrder]);

  const categories = [...new Set(transactions.map((t) => t.category).filter(Boolean))] as string[];

  const summary = {
    total: transactions.reduce((acc, t) => acc + Number(t.amount), 0),
    count: transactions.length,
    byCategory: transactions.reduce((acc, t) => {
      const cat = t.category || "Não classificado";
      if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
      acc[cat].total += Number(t.amount);
      acc[cat].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>),
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formattedMonth = month
    ? format(parseISO(`${month}-01`), "MMMM yyyy", { locale: ptBR })
    : "";

  if (authLoading || houseLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/cards/${cardId}`)}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground capitalize">
                  {formattedMonth}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {card.name} •••• {card.last_digits}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Invoice Summary */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6">
        <div
          className="rounded-xl p-6 text-white"
          style={{ backgroundColor: card.color }}
        >
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Calendar className="w-4 h-4" />
            <span className="text-sm capitalize">{formattedMonth}</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary.total)}</p>
          <p className="text-sm opacity-80 mt-1">
            {summary.count} {summary.count === 1 ? "transação" : "transações"}
          </p>
        </div>
      </div>

      {/* Filters and List */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={categoryFilter || "all"}
            onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={sortField === "date" ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleSort("date")}
            className="gap-1"
          >
            Data
            <ArrowUpDown className="w-3 h-3" />
          </Button>

          <Button
            variant={sortField === "amount" ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleSort("amount")}
            className="gap-1"
          >
            Valor
            <ArrowUpDown className="w-3 h-3" />
          </Button>
        </div>

        {/* Category Summary */}
        <TransactionSummary summary={summary} />

        {/* Transactions List */}
        <div className="space-y-2 pb-6">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <EditableTransactionItem
                key={transaction.id}
                transaction={transaction}
                onCategoryUpdated={fetchData}
              />
            ))
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function getNextMonth(dateStr: string): string {
  const date = parseISO(dateStr);
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return format(next, "yyyy-MM-dd");
}
