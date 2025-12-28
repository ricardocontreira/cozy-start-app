import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, TrendingUp, TrendingDown, Wallet, CreditCard, Settings, LayoutDashboard, LogOut, Copy, Check, Users } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Dummy data for charts and summaries
const summaryData = {
  balance: 12450.75,
  expenses: 3280.50,
  income: 8500.00,
};

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { currentHouse, memberRole, houses, selectHouse, loading: houseLoading } = useHouse();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

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
                  <DropdownMenuItem className="gap-2">
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
        {/* Greeting */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Olá, {userName.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Seu dinheiro, do jeito certo.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6 md:mb-8">
          {/* Total Balance */}
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
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Atualizado agora
              </p>
            </CardContent>
          </Card>

          {/* Monthly Expenses */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.expenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                +12% vs mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Monthly Income */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.income)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                +5% vs mês anterior
              </p>
            </CardContent>
          </Card>
        </div>

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
          </CardContent>
        </Card>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex items-center justify-around py-2">
          <Button variant="ghost" size="sm" className="flex-col h-auto py-2 gap-1">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-col h-auto py-2 gap-1"
            onClick={() => navigate("/cards")}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-xs">Cartões</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-2 gap-1">
            <Wallet className="w-5 h-5" />
            <span className="text-xs">Transações</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-2 gap-1">
            <Settings className="w-5 h-5" />
            <span className="text-xs">Config</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
