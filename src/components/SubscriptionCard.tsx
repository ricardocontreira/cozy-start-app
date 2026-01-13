import { Crown, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { useState } from "react";

export function SubscriptionCard() {
  const { 
    isSubscribed, 
    loading, 
    subscriptionEnd, 
    cancelAtPeriodEnd,
    cancelling,
    startCheckout,
    cancelSubscription 
  } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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

  // Not subscribed
  if (!isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-muted-foreground" />
            Sua Assinatura
          </CardTitle>
          <CardDescription>
            Assine o FinLar Pro para criar e gerenciar casas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-muted-foreground text-sm">
              Você não possui uma assinatura ativa.
            </p>
          </div>
          <Button onClick={startCheckout} className="w-full">
            <Crown className="w-4 h-4 mr-2" />
            Assinar FinLar Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Subscribed but cancellation scheduled
  if (cancelAtPeriodEnd) {
    return (
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
              Após esta data, você perderá acesso a funcionalidades exclusivas.
            </p>
          </div>

          <Button onClick={startCheckout} className="w-full">
            <Crown className="w-4 h-4 mr-2" />
            Reativar Assinatura
          </Button>
        </CardContent>
      </Card>
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
        </CardContent>
      </Card>

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
