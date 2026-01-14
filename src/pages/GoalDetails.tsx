import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, startOfMonth, addMonths, isSameMonth, isBefore, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, 
  Target, 
  Calendar, 
  TrendingUp, 
  Check, 
  X, 
  Clock, 
  PiggyBank,
  Percent,
  Pencil,
  Plus
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useGoalContributions } from "@/hooks/useGoalContributions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddContributionDialog } from "@/components/AddContributionDialog";
import { EditGoalDialog } from "@/components/EditGoalDialog";
import { cn } from "@/lib/utils";

interface MonthStatus {
  date: Date;
  monthLabel: string;
  status: "contributed" | "missed" | "future" | "current";
  totalContributed: number;
  contributions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
  }>;
  requiredContribution: number;
}

export default function GoalDetails() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentHouse, memberRole } = useHouse();
  const { goals, loading: goalsLoading, calculateProgress, updateGoal, refetch: refetchGoals } = useFinancialGoals(currentHouse?.id || null);
  const { contributions, loading: contributionsLoading, refetch: refetchContributions } = useGoalContributions(currentHouse?.id || null);
  
  const [showContributionDialog, setShowContributionDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "contributed" | "missed" | "current" | "future">("all");

  const isOwner = memberRole === "owner";
  
  const goal = useMemo(() => {
    return goals.find(g => g.id === goalId);
  }, [goals, goalId]);

  const progress = useMemo(() => {
    if (!goal) return null;
    return calculateProgress(goal);
  }, [goal, calculateProgress]);

  const goalContributions = useMemo(() => {
    return contributions.filter(c => c.goal_id === goalId);
  }, [contributions, goalId]);

  // Build monthly timeline from goal creation to deadline
  const monthlyTimeline = useMemo((): MonthStatus[] => {
    if (!goal || !progress) return [];

    const timeline: MonthStatus[] = [];
    const startDate = startOfMonth(parseISO(goal.created_at));
    const endDate = startOfMonth(parseISO(goal.deadline));
    const today = new Date();
    const currentMonth = startOfMonth(today);

    let currentDate = startDate;
    
    while (isBefore(currentDate, endDate) || isSameMonth(currentDate, endDate)) {
      const monthContributions = goalContributions.filter(c => {
        const contribDate = parseISO(c.contribution_date);
        return isSameMonth(contribDate, currentDate);
      });

      const totalContributed = monthContributions.reduce((sum, c) => sum + Number(c.amount), 0);

      let status: MonthStatus["status"];
      if (isSameMonth(currentDate, currentMonth)) {
        status = "current";
      } else if (isAfter(currentDate, currentMonth)) {
        status = "future";
      } else if (totalContributed > 0) {
        status = "contributed";
      } else {
        status = "missed";
      }

      timeline.push({
        date: currentDate,
        monthLabel: format(currentDate, "MMM yyyy", { locale: ptBR }),
        status,
        totalContributed,
        contributions: monthContributions.map(c => ({
          id: c.id,
          description: c.description,
          amount: Number(c.amount),
          date: c.contribution_date,
        })),
        requiredContribution: progress.monthlyContribution,
      });

      currentDate = addMonths(currentDate, 1);
    }

    return timeline;
  }, [goal, progress, goalContributions]);

  // Statistics
  const stats = useMemo(() => {
    if (!monthlyTimeline.length) return null;

    const contributed = monthlyTimeline.filter(m => m.status === "contributed").length;
    const missed = monthlyTimeline.filter(m => m.status === "missed").length;
    const future = monthlyTimeline.filter(m => m.status === "future").length;
    const current = monthlyTimeline.filter(m => m.status === "current").length;
    const total = monthlyTimeline.length;

    return { contributed, missed, future, current, total };
  }, [monthlyTimeline]);

  const filteredTimeline = useMemo(() => {
    if (activeFilter === "all") return monthlyTimeline;
    return monthlyTimeline.filter(m => m.status === activeFilter);
  }, [monthlyTimeline, activeFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSuccess = () => {
    refetchGoals();
    refetchContributions();
  };

  const getStatusIcon = (status: MonthStatus["status"]) => {
    switch (status) {
      case "contributed":
        return <Check className="h-4 w-4 text-green-600" />;
      case "missed":
        return <X className="h-4 w-4 text-red-500" />;
      case "future":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "current":
        return <Target className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusBadge = (status: MonthStatus["status"]) => {
    switch (status) {
      case "contributed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Aportado</Badge>;
      case "missed":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Sem aporte</Badge>;
      case "future":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Futuro</Badge>;
      case "current":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Mês atual</Badge>;
    }
  };

  if (goalsLoading || contributionsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!goal || !progress) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Meta não encontrada</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{goal.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Prazo: {format(parseISO(goal.deadline), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* Progress Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Progresso da Meta
              </CardTitle>
              <span className={cn(
                "text-2xl font-bold",
                progress.isCompleted ? "text-green-600" : 
                progress.isOverdue ? "text-red-600" : "text-primary"
              )}>
                {progress.percentage.toFixed(1)}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress.percentage} className="h-3" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Capital Atual</p>
                <p className="font-semibold text-primary">{formatCurrency(progress.currentCapital)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Faltam</p>
                <p className="font-semibold text-amber-600">{formatCurrency(progress.remaining)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Taxa Juros</p>
                <p className="font-semibold">{progress.annualInterestRate}% a.a.</p>
              </div>
            </div>

            {!progress.isCompleted && progress.monthsRemaining > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <PiggyBank className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aporte mensal recomendado</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(progress.monthlyContribution)}</p>
                    <p className="text-xs text-muted-foreground">
                      Para atingir a meta em {progress.monthsRemaining} {progress.monthsRemaining === 1 ? "mês" : "meses"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {progress.isCompleted && (
              <div className="p-4 rounded-lg bg-green-500/10 text-green-700 text-center">
                🎉 Parabéns! Meta alcançada!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Statistics - Clickable Filters */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeFilter === "contributed" && "ring-2 ring-green-500"
              )}
              onClick={() => setActiveFilter(activeFilter === "contributed" ? "all" : "contributed")}
            >
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.contributed}</p>
                <p className="text-xs text-muted-foreground">Meses com aporte</p>
              </CardContent>
            </Card>
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeFilter === "missed" && "ring-2 ring-red-500"
              )}
              onClick={() => setActiveFilter(activeFilter === "missed" ? "all" : "missed")}
            >
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-500">{stats.missed}</p>
                <p className="text-xs text-muted-foreground">Meses sem aporte</p>
              </CardContent>
            </Card>
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeFilter === "current" && "ring-2 ring-primary"
              )}
              onClick={() => setActiveFilter(activeFilter === "current" ? "all" : "current")}
            >
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{stats.current}</p>
                <p className="text-xs text-muted-foreground">Mês atual</p>
              </CardContent>
            </Card>
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeFilter === "future" && "ring-2 ring-muted-foreground"
              )}
              onClick={() => setActiveFilter(activeFilter === "future" ? "all" : "future")}
            >
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-muted-foreground">{stats.future}</p>
                <p className="text-xs text-muted-foreground">Meses futuros</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Histórico Mensal
                </CardTitle>
                <CardDescription>
                  Acompanhe seus aportes mês a mês até o prazo da meta
                </CardDescription>
              </div>
              {activeFilter !== "all" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveFilter("all")}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtro
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredTimeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum mês encontrado com este filtro
                  </div>
                ) : filteredTimeline.map((month) => (
                  <div
                    key={month.monthLabel}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      month.status === "contributed" && "border-green-500/30 bg-green-500/5",
                      month.status === "missed" && "border-red-500/30 bg-red-500/5",
                      month.status === "current" && "border-primary/50 bg-primary/5 shadow-sm",
                      month.status === "future" && "border-border bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          month.status === "contributed" && "bg-green-500/20",
                          month.status === "missed" && "bg-red-500/20",
                          month.status === "current" && "bg-primary/20",
                          month.status === "future" && "bg-muted"
                        )}>
                          {getStatusIcon(month.status)}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{month.monthLabel}</p>
                          {month.status === "current" && (
                            <p className="text-xs text-primary">Você está aqui</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(month.status)}
                      </div>
                    </div>

                    {month.status === "contributed" && (
                      <div className="mt-3 pl-11 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total aportado:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(month.totalContributed)}
                          </span>
                        </div>
                        {month.contributions.map((contrib) => (
                          <div key={contrib.id} className="text-sm text-muted-foreground flex justify-between">
                            <span>{contrib.description}</span>
                            <span>{formatCurrency(contrib.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {month.status === "missed" && (
                      <div className="mt-3 pl-11">
                        <p className="text-sm text-red-500">
                          Nenhum aporte realizado neste mês
                        </p>
                      </div>
                    )}

                    {(month.status === "future" || month.status === "current") && (
                      <div className="mt-3 pl-11">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Aporte recomendado:</span>
                          <span className="font-medium text-primary">
                            {formatCurrency(month.requiredContribution)}
                          </span>
                        </div>
                        {month.status === "current" && month.totalContributed > 0 && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Já aportado:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(month.totalContributed)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* FAB for adding contributions */}
      {isOwner && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            onClick={() => setShowContributionDialog(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AddContributionDialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
        onSuccess={handleSuccess}
        defaultGoalId={goalId}
      />

      {goal && (
        <EditGoalDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          goal={goal}
          onSubmit={async (goalId, data) => {
            const success = await updateGoal(goalId, data);
            if (success) {
              handleSuccess();
            }
            return success;
          }}
        />
      )}
    </div>
  );
}
