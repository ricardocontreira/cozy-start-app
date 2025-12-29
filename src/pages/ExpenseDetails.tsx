import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Filter,
  Search,
  CreditCard,
  TrendingDown,
  Calculator,
  Tag,
  Receipt,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useHouseTransactions, EnrichedTransaction } from "@/hooks/useHouseTransactions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/PeriodSelector";
import { TransactionItem } from "@/components/TransactionItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Category colors for the chart
const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "hsl(24, 95%, 53%)",
  "Transporte": "hsl(217, 91%, 60%)",
  "Compras": "hsl(271, 81%, 56%)",
  "Saúde": "hsl(0, 84%, 60%)",
  "Lazer": "hsl(160, 84%, 39%)",
  "Educação": "hsl(199, 89%, 48%)",
  "Moradia": "hsl(38, 92%, 50%)",
  "Serviços": "hsl(142, 76%, 36%)",
  "Não classificado": "hsl(215, 16%, 47%)",
};

const getRandomColor = (index: number) => {
  const colors = [
    "hsl(160, 84%, 39%)",
    "hsl(24, 95%, 53%)",
    "hsl(217, 91%, 60%)",
    "hsl(271, 81%, 56%)",
    "hsl(38, 92%, 50%)",
    "hsl(199, 89%, 48%)",
    "hsl(142, 76%, 36%)",
    "hsl(0, 63%, 50%)",
  ];
  return colors[index % colors.length];
};

export default function ExpenseDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { currentHouse, loading: houseLoading } = useHouse();

  // Sync selected date from URL params
  const initialDate = useMemo(() => {
    const monthParam = searchParams.get("month");
    if (monthParam) {
      try {
        return parse(monthParam, "yyyy-MM", new Date());
      } catch {
        return new Date();
      }
    }
    return new Date();
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { transactions, isLoading: transactionsLoading } = useHouseTransactions({
    houseId: currentHouse?.id,
  });

  // Fetch credit cards for filter
  const { data: cards = [] } = useQuery({
    queryKey: ["house-cards", currentHouse?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_cards")
        .select("id, name, brand, color")
        .eq("house_id", currentHouse?.id!);
      return data || [];
    },
    enabled: !!currentHouse?.id,
  });

  // Update URL when date changes
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSearchParams({ month: format(date, "yyyy-MM") });
  };

  // Filter transactions by billingMonth and other filters
  const filteredTransactions = useMemo(() => {
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();

    return transactions.filter((txn) => {
      // Filter by billing month (not transaction_date)
      const billingMonth = txn.billingMonth;
      if (
        billingMonth.getMonth() !== selectedMonth ||
        billingMonth.getFullYear() !== selectedYear
      ) {
        return false;
      }

      // Filter by card
      if (cardFilter && txn.card_id !== cardFilter) return false;

      // Filter by category
      if (categoryFilter && txn.category !== categoryFilter) return false;

      // Filter by search query (description)
      if (
        searchQuery &&
        !txn.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [transactions, selectedDate, cardFilter, categoryFilter, searchQuery]);

  // Get unique categories from transactions
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    filteredTransactions.forEach((txn) => {
      if (txn.category) categories.add(txn.category);
    });
    return Array.from(categories).sort();
  }, [filteredTransactions]);

  // Calculate category data for the donut chart
  const categoryData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let total = 0;

    filteredTransactions.forEach((txn) => {
      const cat = txn.category || "Não classificado";
      const amount = Number(txn.amount);
      byCategory[cat] = (byCategory[cat] || 0) + amount;
      total += amount;
    });

    return Object.entries(byCategory)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
        fill: CATEGORY_COLORS[name] || getRandomColor(index),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalExpenses = filteredTransactions.reduce(
      (sum, txn) => sum + Number(txn.amount),
      0
    );
    const averagePerTransaction =
      filteredTransactions.length > 0
        ? totalExpenses / filteredTransactions.length
        : 0;

    const topCategory =
      categoryData.length > 0
        ? { name: categoryData[0].name, total: categoryData[0].value }
        : { name: "-", total: 0 };

    return { totalExpenses, averagePerTransaction, topCategory };
  }, [filteredTransactions, categoryData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const selectedPeriodLabel = format(selectedDate, "MMMM 'de' yyyy", {
    locale: ptBR,
  });

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload?.map((entry: any, index: number) => (
          <div
            key={index}
            className="flex items-center gap-1.5 text-xs px-2 py-1 bg-muted/50 rounded-md"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (authLoading || houseLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Voltar</span>
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-foreground">
                Análise de Despesas
              </h1>
              <p className="text-sm text-muted-foreground">
                Você no controle das suas finanças
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Period Selector */}
        <PeriodSelector
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />

        {/* Summary Cards + Chart */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Donut Chart */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Gastos por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : categoryData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                  <Receipt className="w-12 h-12 mb-3 opacity-50" />
                  <p>Nenhuma despesa encontrada</p>
                  <p className="text-sm capitalize">{selectedPeriodLabel}</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-1">
            {/* Total Expenses */}
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Gastos
                </CardTitle>
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(summaryMetrics.totalExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {selectedPeriodLabel}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Average per Transaction */}
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Média por Transação
                </CardTitle>
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-info" />
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(summaryMetrics.averagePerTransaction)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {filteredTransactions.length} transações
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top Category */}
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Maior Categoria
                </CardTitle>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-warning" />
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-lg font-bold text-foreground">
                      {summaryMetrics.topCategory.name}
                    </div>
                    <p className="text-sm text-destructive">
                      {formatCurrency(summaryMetrics.topCategory.total)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Card Filter */}
          <Select
            value={cardFilter || "all"}
            onValueChange={(value) =>
              setCardFilter(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <CreditCard className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Todos os cartões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={categoryFilter || "all"}
            onValueChange={(value) =>
              setCategoryFilter(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {uniqueCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar estabelecimento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Transactions List */}
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5" />
            Transações
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredTransactions.length})
            </span>
          </h3>

          {transactionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h4 className="font-medium text-foreground mb-1">
                Nenhuma transação encontrada
              </h4>
              <p className="text-sm text-muted-foreground">
                {searchQuery || cardFilter || categoryFilter
                  ? "Tente ajustar os filtros"
                  : "Importe uma fatura para ver suas transações"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border bg-card">
              {filteredTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
