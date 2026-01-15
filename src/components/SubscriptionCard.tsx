import { Crown, AlertTriangle, Loader2, UserCheck, Ticket, Unlink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { UsePlannerCodeDialog } from "./UsePlannerCodeDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    isSubscribed, 
    loading, 
    subscriptionEnd, 
    cancelAtPeriodEnd,
    cancelling,
    isInTrial,
    trialEndsAt,
    plannerSponsored,
    sponsoringPlannerName,
    startCheckout,
    cancelSubscription,
    checkSubscription,
    getTrialDaysRemaining 
  } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPlannerCodeDialog, setShowPlannerCodeDialog] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const handleUnlinkPlanner = async () => {
    if (!user) return;
    
    setUnlinking(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ invited_by_planner_id: null })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Desvinculado",
        description: "Você foi desvinculado do planejador.",
      });

      await checkSubscription();
    } catch (error) {
      console.error("Error unlinking planner:", error);
      toast({
        title: "Erro",
        description: "Não foi possível desvincular do planejador.",
        variant: "destructive",
      });
    } finally {
      setUnlinking(false);
    }
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  // Sponsored by planner
  if (plannerSponsored) {
    return (
      <>
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Acesso Patrocinado
            </CardTitle>
            <CardDescription>
              Você tem acesso ao FinLar Pro através de um planejador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">FinLar Pro</span>
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                <UserCheck className="w-3 h-3 mr-1" />
                Patrocinado
              </Badge>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Planejador:</strong> {sponsoringPlannerName || "Não identificado"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Seu acesso é mantido enquanto estiver vinculado ao planejador.
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={handleUnlinkPlanner}
              disabled={unlinking}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {unlinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Desvinculando...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Desvincular do Planejador
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  // In trial
  if (isInTrial && !isSubscribed) {
    return (
      <>
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Período de Teste
            </CardTitle>
            <CardDescription>
              Aproveite o FinLar Pro gratuitamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">FinLar Pro</span>
              </div>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {trialDaysRemaining} {trialDaysRemaining === 1 ? "dia" : "dias"} restantes
              </Badge>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Teste até:</strong> {formatDate(trialEndsAt)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Após esta data, você precisará assinar ou usar um código de planejador.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={startCheckout} className="w-full">
                <Crown className="w-4 h-4 mr-2" />
                Assinar Agora
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPlannerCodeDialog(true)}
                className="w-full"
              >
                <Ticket className="w-4 h-4 mr-2" />
                Usar Código do Planejador
              </Button>
            </div>
          </CardContent>
        </Card>

        <UsePlannerCodeDialog
          open={showPlannerCodeDialog}
          onOpenChange={setShowPlannerCodeDialog}
          onSuccess={checkSubscription}
          userId={user?.id || ""}
        />
      </>
    );
  }

  // Not subscribed (trial expired or no trial)
  if (!isSubscribed) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-muted-foreground" />
              Sua Assinatura
            </CardTitle>
            <CardDescription>
              Assine o FinLar Pro para continuar usando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
              <p className="text-destructive text-sm font-medium">
                Seu acesso expirou. Assine ou use um código do planejador.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={startCheckout} className="w-full">
                <Crown className="w-4 h-4 mr-2" />
                Assinar FinLar Pro
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPlannerCodeDialog(true)}
                className="w-full"
              >
                <Ticket className="w-4 h-4 mr-2" />
                Usar Código do Planejador
              </Button>
            </div>
          </CardContent>
        </Card>

        <UsePlannerCodeDialog
          open={showPlannerCodeDialog}
          onOpenChange={setShowPlannerCodeDialog}
          onSuccess={checkSubscription}
          userId={user?.id || ""}
        />
      </>
    );
  }

  // Subscribed but cancellation scheduled
  if (cancelAtPeriodEnd) {
    return (
      <>
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Sua Assinatura
            </CardTitle>
            <CardDescription>
              Gerencie seu plano FinLar Pro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">FinLar Pro</span>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Cancela em breve
              </Badge>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Acesso até:</strong> {formatDate(subscriptionEnd)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Após esta data, você pode usar um código de planejador para manter o acesso.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={startCheckout} className="w-full">
                <Crown className="w-4 h-4 mr-2" />
                Reativar Assinatura
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPlannerCodeDialog(true)}
                className="w-full"
              >
                <Ticket className="w-4 h-4 mr-2" />
                Usar Código do Planejador
              </Button>
            </div>
          </CardContent>
        </Card>

        <UsePlannerCodeDialog
          open={showPlannerCodeDialog}
          onOpenChange={setShowPlannerCodeDialog}
          onSuccess={checkSubscription}
          userId={user?.id || ""}
        />
      </>
    );
  }

  // Active subscription
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Sua Assinatura
          </CardTitle>
          <CardDescription>
            Gerencie seu plano FinLar Pro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">FinLar Pro</span>
            </div>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
              Ativa
            </Badge>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Próxima renovação:</strong> {formatDate(subscriptionEnd)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPlannerCodeDialog(true)}
              className="w-full"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Usar Código do Planejador
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowCancelDialog(true)}
              disabled={cancelling}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Cancelar Assinatura"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <UsePlannerCodeDialog
        open={showPlannerCodeDialog}
        onOpenChange={setShowPlannerCodeDialog}
        onSuccess={checkSubscription}
        userId={user?.id || ""}
      />

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={async () => {
          const { success } = await cancelSubscription();
          if (success) {
            setShowCancelDialog(false);
          }
        }}
        subscriptionEnd={formatDate(subscriptionEnd)}
        cancelling={cancelling}
      />
    </>
  );
}
