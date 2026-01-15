import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/hooks/usePlannerProfile";
import {
  usePlannerClientDetails,
  type ClientGoal,
  type CategoryExpense,
} from "@/hooks/usePlannerClientDetails";
import { getCategoryInfo } from "@/lib/categories";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlannerBottomNav } from "@/components/PlannerBottomNav";

export default function ClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPlanner, loading: profileLoading } = usePlannerProfile();

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
  } = usePlannerClientDetails(clientId || null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/planner/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!profileLoading && !isPlanner) {
      navigate("/dashboard");
    }
  }, [isPlanner, profileLoading, navigate]);

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
      fetchMonthlyExpenses(selectedMonth);
      fetchGoals();
    }
  }, [clientId, fetchClientDetails, fetchGoals]);

  useEffect(() => {
    if (clientId) {
      fetchMonthlyExpenses(selectedMonth);
    }
  }, [selectedMonth, clientId, fetchMonthlyExpenses]);

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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/planner")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Detalhes do Cliente
              </h1>
              {clientDetails && (
                <p className="text-sm text-muted-foreground hidden md:block">
                  {clientDetails.full_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:px-6">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ) : clientDetails ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Personal Info (sticky on desktop) */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center lg:items-center">
                    <Avatar className="h-20 w-20 lg:h-24 lg:w-24 mb-4">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl lg:text-2xl">
                        {getInitials(clientDetails.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl lg:text-2xl font-semibold mb-4">
                      {clientDetails.full_name || "Sem nome"}
                    </h2>
                    <div className="space-y-3 text-sm text-muted-foreground w-full">
                      {clientDetails.phone && (
                        <a
                          href={`https://wa.me/55${clientDetails.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 hover:text-primary p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span>{clientDetails.phone}</span>
                        </a>
                      )}
                      {clientDetails.email && (
                        <a
                          href={`mailto:${clientDetails.email}`}
                          className="flex items-center gap-3 hover:text-primary p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{clientDetails.email}</span>
                        </a>
                      )}
                      {clientDetails.birth_date && (
                        <div className="flex items-center gap-3 p-2">
                          <Calendar className="h-4 w-4" />
                          <span>Nascimento: {formatDate(clientDetails.birth_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-2">
                        <User className="h-4 w-4" />
                        <span>Cliente desde {formatDate(clientDetails.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Card - Desktop only */}
              <Card className="hidden lg:block">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gastos do mês</span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(monthlyExpenses?.total || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Metas ativas</span>
                    <span className="font-semibold">{goals.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Categorias</span>
                    <span className="font-semibold">
                      {monthlyExpenses?.categories?.length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Expenses and Goals */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expenses Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Gastos Mensais</CardTitle>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigateMonth("prev")}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium capitalize text-sm px-2 min-w-[140px] text-center">
                        {formatMonthDisplay(selectedMonth)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigateMonth("next")}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {expensesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Total */}
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total de Gastos</span>
                          <span className="text-2xl lg:text-3xl font-bold text-destructive">
                            {formatCurrency(monthlyExpenses?.total || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Categories Grid */}
                      {monthlyExpenses?.categories &&
                      monthlyExpenses.categories.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {monthlyExpenses.categories.map(
                            (category: CategoryExpense, index: number) => {
                              const categoryInfo = getCategoryInfo(category.category);
                              const percentage =
                                maxCategoryTotal > 0
                                  ? (category.total / maxCategoryTotal) * 100
                                  : 0;

                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                                >
                                  <div
                                    className="p-2.5 rounded-lg shrink-0"
                                    style={{
                                      backgroundColor: `${categoryInfo.color}20`,
                                    }}
                                  >
                                    <categoryInfo.icon
                                      className="h-5 w-5"
                                      style={{ color: categoryInfo.color }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-medium text-sm truncate">
                                        {categoryInfo.label}
                                      </span>
                                      <span className="font-semibold">
                                        {formatCurrency(category.total)}
                                      </span>
                                    </div>
                                    <Progress value={percentage} className="h-1.5" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {category.count}{" "}
                                      {category.count === 1 ? "transação" : "transações"}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>Nenhum gasto registrado neste mês</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Goals Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Metas Financeiras</CardTitle>
                </CardHeader>
                <CardContent>
                  {goalsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-40" />
                      <Skeleton className="h-40" />
                    </div>
                  ) : goals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {goals.map((goal: ClientGoal) => {
                        const progress = calculateGoalProgress(goal);
                        const goalStatus = getGoalStatus(goal);

                        return (
                          <div
                            key={goal.id}
                            className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-semibold">{goal.title}</h4>
                              <Badge variant={goalStatus.variant} className="shrink-0">
                                {goalStatus.status === "completed" && (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                {goalStatus.status === "overdue" && (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {goalStatus.label}
                              </Badge>
                            </div>

                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium">{progress.toFixed(1)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-muted/50 rounded p-2">
                                <p className="text-xs text-muted-foreground">Atual</p>
                                <p className="font-semibold text-primary">
                                  {formatCurrency(goal.current_capital)}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded p-2">
                                <p className="text-xs text-muted-foreground">Meta</p>
                                <p className="font-semibold">
                                  {formatCurrency(goal.target_amount)}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded p-2">
                                <p className="text-xs text-muted-foreground">Taxa</p>
                                <p className="font-medium">{goal.annual_interest_rate}%</p>
                              </div>
                              <div className="bg-muted/50 rounded p-2">
                                <p className="text-xs text-muted-foreground">Prazo</p>
                                <p className="font-medium">{formatDate(goal.deadline)}</p>
                              </div>
                            </div>

                            {goal.total_contributions > 0 && (
                              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                                Aportes: {formatCurrency(goal.total_contributions)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma meta financeira cadastrada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>Erro ao carregar dados do cliente</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/planner")}
                >
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Mobile Navigation */}
      <PlannerBottomNav activeRoute="home" />
    </div>
  );
}
