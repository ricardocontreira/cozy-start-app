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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/planner/auth");
    }
  }, [user, authLoading, navigate]);

  // Redirect non-planners
  useEffect(() => {
    if (!profileLoading && !isPlanner) {
      navigate("/dashboard");
    }
  }, [isPlanner, profileLoading, navigate]);

  // Fetch data when clientId changes
  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
      fetchMonthlyExpenses(selectedMonth);
      fetchGoals();
    }
  }, [clientId, fetchClientDetails, fetchGoals]);

  // Fetch expenses when month changes
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
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/planner")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              Detalhes do Cliente
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : clientDetails ? (
          <div className="space-y-6">
            {/* Personal Info Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {getInitials(clientDetails.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h2 className="text-xl font-semibold">
                      {clientDetails.full_name || "Sem nome"}
                    </h2>
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
                          Nascimento: {formatDate(clientDetails.birth_date)}
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
              <TabsContent value="expenses" className="space-y-4 mt-4">
                {/* Month Selector */}
                <div className="flex items-center justify-between bg-card rounded-lg p-2 border">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="font-medium capitalize text-lg">
                    {formatMonthDisplay(selectedMonth)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {expensesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Total Card */}
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">
                            Total de Gastos
                          </p>
                          <p className="text-3xl font-bold text-destructive">
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
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="p-3 rounded-lg"
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
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">
                                          {categoryInfo.label}
                                        </span>
                                        <span className="font-semibold text-lg">
                                          {formatCurrency(category.total)}
                                        </span>
                                      </div>
                                      <Progress
                                        value={percentage}
                                        className="h-2"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {category.count}{" "}
                                        {category.count === 1
                                          ? "transação"
                                          : "transações"}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-12">
                          <div className="text-center text-muted-foreground">
                            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Nenhum gasto registrado</p>
                            <p className="text-sm">neste mês</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Goals Tab */}
              <TabsContent value="goals" className="space-y-4 mt-4">
                {goalsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : goals.length > 0 ? (
                  <div className="space-y-4">
                    {goals.map((goal: ClientGoal) => {
                      const progress = calculateGoalProgress(goal);
                      const goalStatus = getGoalStatus(goal);

                      return (
                        <Card key={goal.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">
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
                          <CardContent className="space-y-4">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">
                                  Progresso
                                </span>
                                <span className="font-semibold text-lg">
                                  {progress.toFixed(1)}%
                                </span>
                              </div>
                              <Progress value={progress} className="h-3" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Capital Atual
                                </p>
                                <p className="font-semibold text-primary text-lg">
                                  {formatCurrency(goal.current_capital)}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Meta
                                </p>
                                <p className="font-semibold text-lg">
                                  {formatCurrency(goal.target_amount)}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Taxa Anual
                                </p>
                                <p className="font-medium">
                                  {goal.annual_interest_rate}%
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Prazo
                                </p>
                                <p className="font-medium">
                                  {formatDate(goal.deadline)}
                                </p>
                              </div>
                            </div>

                            {goal.total_contributions > 0 && (
                              <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground">
                                  Total em aportes:{" "}
                                  <span className="font-semibold text-foreground">
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
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Nenhuma meta financeira</p>
                        <p className="text-sm">cadastrada</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
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
