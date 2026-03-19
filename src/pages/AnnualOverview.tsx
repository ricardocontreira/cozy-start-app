import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useHouseTransactions } from "@/hooks/useHouseTransactions";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AnnualOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentHouse } = useHouse();
  const { transactions, isLoading } = useHouseTransactions({ houseId: currentHouse?.id });

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const monthTransactions = useMemo(() => {
    if (selectedMonth === null) return { receitas: [], despesas: [] };
    const receitas = transactions.filter(
      (t) => t.billingMonth.getFullYear() === selectedYear && t.billingMonth.getMonth() === selectedMonth && t.type === "income"
    );
    const despesas = transactions.filter(
      (t) => t.billingMonth.getFullYear() === selectedYear && t.billingMonth.getMonth() === selectedMonth && t.type !== "income"
    );
    return { receitas, despesas };
  }, [transactions, selectedYear, selectedMonth]);

  const monthlyData = useMemo(() => {
    const data = MONTH_LABELS.map((label, i) => ({
      name: label,
      month: i,
      receitas: 0,
      despesas: 0,
    }));

    transactions.forEach((txn) => {
      const billingDate = txn.billingMonth;
      if (billingDate.getFullYear() !== selectedYear) return;
      const monthIndex = billingDate.getMonth();
      const amount = Math.abs(Number(txn.amount));

      if (txn.type === "income") {
        data[monthIndex].receitas += amount;
      } else {
        data[monthIndex].despesas += amount;
      }
    });

    return data;
  }, [transactions, selectedYear]);

  const totals = useMemo(() => {
    const totalReceitas = monthlyData.reduce((sum, m) => sum + m.receitas, 0);
    const totalDespesas = monthlyData.reduce((sum, m) => sum + m.despesas, 0);
    return {
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
    };
  }, [monthlyData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg text-sm">
        <p className="font-semibold mb-1">{label}/{selectedYear}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Visão Financeira Anual</h1>
        </div>

        {/* Year selector */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-2xl font-bold">{selectedYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setSelectedYear((y) => y + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="px-4 -mt-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Receitas</p>
              {isLoading ? (
                <Skeleton className="h-5 w-20 mx-auto mt-1" />
              ) : (
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(totals.receitas)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-3 text-center">
              <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Despesas</p>
              {isLoading ? (
                <Skeleton className="h-5 w-20 mx-auto mt-1" />
              ) : (
                <p className="text-sm font-bold text-red-600">{formatCurrency(totals.despesas)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-3 text-center">
              <Scale className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
              {isLoading ? (
                <Skeleton className="h-5 w-20 mx-auto mt-1" />
              ) : (
                <p className={`text-sm font-bold ${totals.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(totals.saldo)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[280px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) => <span className="text-foreground">{value}</span>}
                    />
                    <Bar dataKey="receitas" name="Receitas" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly table */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-base font-semibold">Detalhamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1 text-xs font-medium text-muted-foreground">Mês</th>
                      <th className="text-right py-1 text-xs font-medium text-emerald-600">Receitas</th>
                      <th className="text-right py-1 text-xs font-medium text-red-600">Despesas</th>
                      <th className="text-right py-1 text-xs font-medium text-muted-foreground">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, i) => {
                      const saldo = m.receitas - m.despesas;
                      const hasData = m.receitas > 0 || m.despesas > 0;
                      return (
                        <tr
                          key={i}
                          className={`border-b border-border/30 ${!hasData ? "opacity-40" : ""}`}
                        >
                          <td className="py-2.5 font-medium">{m.name}</td>
                          <td className="py-2.5 text-right text-emerald-600">
                            {hasData ? formatCurrency(m.receitas) : "—"}
                          </td>
                          <td className="py-2.5 text-right text-red-600">
                            {hasData ? formatCurrency(m.despesas) : "—"}
                          </td>
                          <td className={`py-2.5 text-right font-medium ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {hasData ? formatCurrency(saldo) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="font-bold border-t-2 border-border">
                      <td className="py-3">Total</td>
                      <td className="py-3 text-right text-emerald-600">{formatCurrency(totals.receitas)}</td>
                      <td className="py-3 text-right text-red-600">{formatCurrency(totals.despesas)}</td>
                      <td className={`py-3 text-right ${totals.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(totals.saldo)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav activeRoute="dashboard" />
    </div>
  );
}
