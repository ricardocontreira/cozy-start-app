import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Home, TrendingUp, TrendingDown, Wallet, CreditCard, Settings, LogOut, Copy, Check, Users, ChevronRight, Clock, Sparkles, Target, PiggyBank, Plus } from "lucide-react";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useGoalContributions } from "@/hooks/useGoalContributions";
import { Progress } from "@/components/ui/progress";
import { AddContributionDialog } from "@/components/AddContributionDialog";
import { SubscriptionDialog } from "@/components/SubscriptionDialog";
import { MemberAccessBlockedDialog } from "@/components/MemberAccessBlockedDialog";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useHouseTransactions } from "@/hooks/useHouseTransactions";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PeriodSelector } from "@/components/PeriodSelector";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AddTransactionFab } from "@/components/AddTransactionFab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { currentHouse, memberRole, houses, selectHouse, leaveHouse, loading: houseLoading } = useHouse();
  const { transactions, isLoading: transactionsLoading } = useHouseTransactions({ houseId: currentHouse?.id });
  const { 
    isSubscribed, 
    isInTrial, 
    hasAccess, 
    loading: subscriptionLoading, 
    trialEndsAt,
    getTrialDaysRemaining,
    startCheckout,
  } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTrialExpiredDialog, setShowTrialExpiredDialog] = useState(false);
  const [showMemberBlockedDialog, setShowMemberBlockedDialog] = useState(false);
  const [showContributionDialog, setShowContributionDialog] = useState(false);

  // Fetch credit cards for the current house
  const { data: creditCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["house-cards", currentHouse?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("id, name, brand, color, last_digits")
        .eq("house_id", currentHouse?.id!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentHouse?.id,
  });

  // Fetch financial goals for the current house
  const { goals, loading: goalsLoading, calculateProgress, refetch: refetchGoals } = useFinancialGoals(currentHouse?.id || null);

  // Fetch goal contributions
  const { 
    getContributionsByMonth, 
    getTotalByMonth, 
    refetch: refetchContributions 
  } = useGoalContributions(currentHouse?.id || null);

  // Get contributions for selected month
  const monthlyContributions = getContributionsByMonth(
    selectedDate.getFullYear(),
    selectedDate.getMonth()
  );
  const monthlyContributionsTotal = getTotalByMonth(
    selectedDate.getFullYear(),
    selectedDate.getMonth()
  );

  const handleContributionSuccess = () => {
    refetchGoals();
    refetchContributions();
  };

  // Calculate monthly expenses (only type='expense')
  const monthlyExpenses = useMemo(() => {
    if (!transactions.length) return 0;
    
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    
    return transactions
      .filter(txn => {
        const billingMonth = txn.billingMonth;
        return txn.type === "expense" &&
               billingMonth.getMonth() === selectedMonth && 
               billingMonth.getFullYear() === selectedYear;
      })
      .reduce((sum, txn) => sum + Number(txn.amount), 0);
  }, [transactions, selectedDate]);

  // Calculate monthly income (only type='income')
  const monthlyIncome = useMemo(() => {
    if (!transactions.length) return 0;
    
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    
    return transactions
      .filter(txn => {
        const billingMonth = txn.billingMonth;
        return txn.type === "income" &&
               billingMonth.getMonth() === selectedMonth && 
               billingMonth.getFullYear() === selectedYear;
      })
      .reduce((sum, txn) => sum + Number(txn.amount), 0);
  }, [transactions, selectedDate]);

  // Calculate balance (income - expenses)
  const balance = monthlyIncome - monthlyExpenses;

  // Format the selected period for display
  const selectedPeriodLabel = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!houseLoading && user && houses.length === 0) {
      navigate("/house-setup");
    }
  }, [houses, houseLoading, user, navigate]);

  // Check for trial expiration and show subscription dialog if no access (owners)
  useEffect(() => {
    if (!subscriptionLoading && !hasAccess && houses.length > 0 && memberRole === "owner") {
      setShowTrialExpiredDialog(true);
    }
  }, [hasAccess, subscriptionLoading, houses, memberRole]);

  // Check for trial expiration and show blocked dialog if no access (members/viewers)
  useEffect(() => {
    if (!subscriptionLoading && !hasAccess && houses.length > 0 && memberRole === "viewer") {
      setShowMemberBlockedDialog(true);
    }
  }, [hasAccess, subscriptionLoading, houses, memberRole]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const copyInviteCode = () => {
    if (currentHouse?.invite_code) {
      navigator.clipboard.writeText(currentHouse.invite_code);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Compartilhe com quem você deseja convidar.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return format(new Date(dateStr), "dd 'de' MMMM", { locale: ptBR });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const trialDaysRemaining = getTrialDaysRemaining();

  if (authLoading || houseLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo & House Selector */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Home className="w-6 h-6 text-primary-foreground" />
              </div>
              
              {houses.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 font-semibold">
                      {currentHouse?.name || "Selecionar Casa"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Suas Casas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {houses.map((house) => (
                      <DropdownMenuItem
                        key={house.id}
                        onClick={() => selectHouse(house.id)}
                        className={currentHouse?.id === house.id ? "bg-accent" : ""}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        {house.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/house-setup")}>
                      <Users className="w-4 h-4 mr-2" />
                      Criar/Entrar em Casa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="font-semibold text-foreground">{currentHouse?.name}</span>
              )}
            </div>

            {/* Right side - Theme toggle & User menu */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{userName}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {memberRole === "owner" ? "Proprietário" : "Visualizador"}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memberRole === "owner" && currentHouse && (
                    <DropdownMenuItem onClick={copyInviteCode} className="gap-2">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Código: {currentHouse.invite_code}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2">
                    <Settings className="w-4 h-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
                    <LogOut className="w-4 h-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Trial Banner - Only for owners in trial */}
        {isInTrial && !isSubscribed && memberRole === "owner" && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Período de teste: {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Assine antes de {formatDate(trialEndsAt)} para não perder o acesso
                  </p>
                </div>
              </div>
              <Button size="sm" className="gap-2" onClick={() => startCheckout()}>
                <Sparkles className="w-4 h-4" />
                Assinar agora
              </Button>
            </div>
          </div>
        )}

        {/* Greeting */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Olá, {userName.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Seu dinheiro, do jeito certo.
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 md:mb-8">
          <PeriodSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6 md:mb-8">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl md:text-3xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {selectedPeriodLabel}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Expenses - Clickable */}
          <Card 
            className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => navigate(`/expense-details?month=${format(selectedDate, "yyyy-MM")}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {formatCurrency(monthlyExpenses)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {selectedPeriodLabel}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Income - Clickable */}
          <Card 
            className="border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => navigate(`/income-details?month=${format(selectedDate, "yyyy-MM")}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {formatCurrency(monthlyIncome)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {selectedPeriodLabel}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Contributions Preview */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Aportes do Mês</CardTitle>
              <CardDescription className="capitalize">{selectedPeriodLabel}</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowContributionDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Novo Aporte
            </Button>
          </CardHeader>
          <CardContent>
            {monthlyContributions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum aporte neste mês.</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-primary"
                  onClick={() => setShowContributionDialog(true)}
                >
                  Registrar primeiro aporte
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Total do Mês */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">Total do Mês</span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(monthlyContributionsTotal)}
                  </span>
                </div>

                {/* Lista de aportes */}
                {monthlyContributions.slice(0, 3).map((contribution) => (
                  <button
                    key={contribution.id}
                    onClick={() => navigate("/planning")}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/50 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {contribution.goal?.title || "Meta"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contribution.description} • {format(new Date(contribution.contribution_date), "dd/MM")}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary shrink-0 ml-2">
                      {formatCurrency(Number(contribution.amount))}
                    </span>
                  </button>
                ))}
                {monthlyContributions.length > 3 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    +{monthlyContributions.length - 3} {monthlyContributions.length - 3 === 1 ? "aporte" : "aportes"}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Cards Preview */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Cartões de Crédito</CardTitle>
              <CardDescription>Gerencie seus cartões</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate("/cards")}
            >
              <CreditCard className="w-4 h-4" />
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            {cardsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : creditCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cartão cadastrado ainda.</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-primary"
                  onClick={() => navigate("/cards")}
                >
                  Adicionar primeiro cartão
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {creditCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => navigate(`/cards/${card.id}`)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:shadow-md transition-all text-left group"
                    style={{ borderLeftColor: card.color, borderLeftWidth: 4 }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCard className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{card.name}</p>
                      <p className="text-sm text-muted-foreground">
                        •••• {card.last_digits}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Goals Preview */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Metas Financeiras</CardTitle>
              <CardDescription>Acompanhe seu progresso</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate("/planning")}
            >
              <Target className="w-4 h-4" />
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {goalsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma meta cadastrada ainda.</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-primary"
                  onClick={() => navigate("/planning")}
                >
                  Criar primeira meta
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => {
                  const progress = calculateProgress(goal);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => navigate("/planning")}
                      className="w-full flex flex-col gap-2 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground truncate">{goal.title}</span>
                        </div>
                        <span className={`text-sm font-semibold ${
                          progress.isCompleted ? "text-green-600" : 
                          progress.isOverdue ? "text-red-600" : "text-primary"
                        }`}>
                          {progress.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={progress.percentage} 
                        className="h-2" 
                      />
                    </button>
                  );
                })}
                {goals.length > 3 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    +{goals.length - 3} {goals.length - 3 === 1 ? "meta" : "metas"}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* FAB for adding expense/income */}
      <AddTransactionFab onSuccess={handleContributionSuccess} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeRoute="dashboard" />

      {/* Trial Expired Subscription Dialog */}
      <SubscriptionDialog
        open={showTrialExpiredDialog}
        onOpenChange={(open) => {
          // Don't allow closing if user doesn't have access
          if (!open && !hasAccess) return;
          setShowTrialExpiredDialog(open);
        }}
        onSubscribe={() => startCheckout()}
        loading={false}
        isInTrial={false}
        trialDaysRemaining={0}
        trialExpired={true}
      />

      {/* Member Access Blocked Dialog */}
      <MemberAccessBlockedDialog
        open={showMemberBlockedDialog}
        onOpenChange={setShowMemberBlockedDialog}
        onLeaveHouse={async () => {
          await leaveHouse();
          navigate("/house-setup");
        }}
        houseName={currentHouse?.name || ""}
      />

      {/* Add Contribution Dialog */}
      <AddContributionDialog
        open={showContributionDialog}
        onOpenChange={setShowContributionDialog}
        onSuccess={handleContributionSuccess}
      />
    </div>
  );
}
