import { useEffect, useState } from "react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  usePlannerClientDetails,
  type ClientGoal,
  type CategoryExpense,
} from "@/hooks/usePlannerClientDetails";
import { getCategoryInfo } from "@/lib/categories";

interface ClientDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
}

export function ClientDetailsSheet({
  open,
  onOpenChange,
  clientId,
}: ClientDetailsSheetProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM");
  });

  const {
    clientDetails,
    monthlyExpenses,
    goals,
    loading,
    expensesLoading,
    goalsLoading,
    fetchClientDetails,
    fetchMonthlyExpenses,
    fetchGoals,
    reset,
  } = usePlannerClientDetails(clientId);

  useEffect(() => {
    if (open && clientId) {
      fetchClientDetails();
      fetchMonthlyExpenses(selectedMonth);
      fetchGoals();
    } else if (!open) {
      reset();
    }
  }, [open, clientId, fetchClientDetails, fetchGoals, reset]);

  useEffect(() => {
    if (open && clientId) {
      fetchMonthlyExpenses(selectedMonth);
    }
  }, [selectedMonth, open, clientId, fetchMonthlyExpenses]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMMM yyyy", { locale: ptBR });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    if (direction === "prev") {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setSelectedMonth(format(date, "yyyy-MM"));
  };

  const calculateGoalProgress = (goal: ClientGoal) => {
    const percentage = (goal.current_capital / goal.target_amount) * 100;
    return Math.min(percentage, 100);
  };

  const getGoalStatus = (goal: ClientGoal) => {
    const progress = calculateGoalProgress(goal);
    const deadlineDate = parseISO(goal.deadline);
    const isOverdue = isPast(deadlineDate);
    const daysRemaining = differenceInDays(deadlineDate, new Date());

    if (progress >= 100) {
      return { status: "completed", label: "Concluída", variant: "default" as const };
    }
    if (isOverdue) {
      return { status: "overdue", label: "Vencida", variant: "destructive" as const };
    }
    if (daysRemaining <= 30) {
      return { status: "urgent", label: `${daysRemaining} dias`, variant: "secondary" as const };
    }
    return { status: "active", label: "Em andamento", variant: "outline" as const };
  };

  const maxCategoryTotal = monthlyExpenses?.categories?.length
    ? Math.max(...monthlyExpenses.categories.map((c) => c.total))
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Detalhes do Cliente</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ) : clientDetails ? (
          <div className="space-y-6">
            {/* Personal Info Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {getInitials(clientDetails.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-semibold">
                      {clientDetails.full_name || "Sem nome"}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {clientDetails.phone && (
                        <a
                          href={`https://wa.me/55${clientDetails.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <Phone className="h-4 w-4" />
                          {clientDetails.phone}
                        </a>
                      )}
                      {clientDetails.email && (
                        <a
                          href={`mailto:${clientDetails.email}`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <Mail className="h-4 w-4" />
                          {clientDetails.email}
                        </a>
                      )}
                      {clientDetails.birth_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(clientDetails.birth_date)}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Cliente desde {formatDate(clientDetails.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Expenses and Goals */}
            <Tabs defaultValue="expenses" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expenses">Gastos</TabsTrigger>
                <TabsTrigger value="goals">Metas</TabsTrigger>
              </TabsList>

              {/* Expenses Tab */}
              <TabsContent value="expenses" className="space-y-4">
                {/* Month Selector */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium capitalize">
                    {formatMonthDisplay(selectedMonth)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {expensesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Total Card */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Total de Gastos
                          </p>
                          <p className="text-2xl font-bold text-destructive">
                            {formatCurrency(monthlyExpenses?.total || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Categories List */}
                    {monthlyExpenses?.categories &&
                    monthlyExpenses.categories.length > 0 ? (
                      <div className="space-y-3">
                        {monthlyExpenses.categories.map(
                          (category: CategoryExpense, index: number) => {
                            const categoryInfo = getCategoryInfo(
                              category.category
                            );
                            const percentage =
                              maxCategoryTotal > 0
                                ? (category.total / maxCategoryTotal) * 100
                                : 0;

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                              >
                                <div
                                  className="p-2 rounded-lg"
                                  style={{
                                    backgroundColor: `${categoryInfo.color}20`,
                                  }}
                                >
                                  <categoryInfo.icon
                                    className="h-4 w-4"
                                    style={{ color: categoryInfo.color }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium truncate">
                                      {categoryInfo.label}
                                    </span>
                                    <span className="text-sm font-semibold">
                                      {formatCurrency(category.total)}
                                    </span>
                                  </div>
                                  <Progress
                                    value={percentage}
                                    className="h-1.5"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {category.count}{" "}
                                    {category.count === 1
                                      ? "transação"
                                      : "transações"}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum gasto registrado neste mês</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Goals Tab */}
              <TabsContent value="goals" className="space-y-4">
                {goalsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : goals.length > 0 ? (
                  <div className="space-y-3">
                    {goals.map((goal: ClientGoal) => {
                      const progress = calculateGoalProgress(goal);
                      const goalStatus = getGoalStatus(goal);

                      return (
                        <Card key={goal.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">
                                {goal.title}
                              </CardTitle>
                              <Badge variant={goalStatus.variant}>
                                {goalStatus.status === "completed" && (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                {goalStatus.status === "overdue" && (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {goalStatus.label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">
                                  Progresso
                                </span>
                                <span className="font-medium">
                                  {progress.toFixed(1)}%
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  Capital Atual
                                </p>
                                <p className="font-semibold text-primary">
                                  {formatCurrency(goal.current_capital)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Meta</p>
                                <p className="font-semibold">
                                  {formatCurrency(goal.target_amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Taxa Anual
                                </p>
                                <p className="font-medium">
                                  {goal.annual_interest_rate}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Prazo</p>
                                <p className="font-medium">
                                  {formatDate(goal.deadline)}
                                </p>
                              </div>
                            </div>

                            {goal.total_contributions > 0 && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">
                                  Total em aportes:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(goal.total_contributions)}
                                  </span>
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma meta financeira cadastrada</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Erro ao carregar dados do cliente</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
