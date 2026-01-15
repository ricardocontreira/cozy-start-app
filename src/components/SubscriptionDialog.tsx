import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Sparkles, Clock, Ticket } from "lucide-react";
import { UsePlannerCodeDialog } from "./UsePlannerCodeDialog";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: () => void;
  onPlannerCodeSuccess?: () => void;
  loading?: boolean;
  isInTrial?: boolean;
  trialDaysRemaining?: number;
  trialExpired?: boolean;
  userId?: string;
}

export function SubscriptionDialog({
  open,
  onOpenChange,
  onSubscribe,
  onPlannerCodeSuccess,
  loading,
  isInTrial,
  trialDaysRemaining,
  trialExpired,
  userId,
}: SubscriptionDialogProps) {
  const [showPlannerCodeDialog, setShowPlannerCodeDialog] = useState(false);

  const benefits = [
    "Criar casas ilimitadas",
    "Gerenciar despesas compartilhadas",
    "Adicionar cartões de crédito",
    "Upload de faturas com IA",
    "Relatórios e gráficos",
    "Convidar membros da família",
  ];

  const handlePlannerCodeSuccess = () => {
    setShowPlannerCodeDialog(false);
    onOpenChange(false);
    onPlannerCodeSuccess?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              {trialExpired 
                ? "Período de teste encerrado" 
                : isInTrial 
                  ? "Continue com o FinLar Pro" 
                  : "Assine o FinLar Pro"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {trialExpired ? (
                <span className="text-destructive">
                  Seu período de teste de 7 dias terminou. Assine ou use um código de planejador para continuar.
                </span>
              ) : isInTrial && trialDaysRemaining !== undefined ? (
                <span className="flex items-center justify-center gap-2 text-warning">
                  <Clock className="h-4 w-4" />
                  Seu período de teste termina em {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}. 
                </span>
              ) : (
                "Para criar uma Casa, você precisa ser assinante ou ter um código de planejador."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-primary">R$ 19,99</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>

            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={onSubscribe}
                disabled={loading}
                className="w-full gap-2"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Redirecionando..." : "Assinar agora"}
              </Button>

              {userId && (
                <Button
                  variant="outline"
                  onClick={() => setShowPlannerCodeDialog(true)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Ticket className="h-4 w-4" />
                  Tenho um código do planejador
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Cancele a qualquer momento. Sem compromisso.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {userId && (
        <UsePlannerCodeDialog
          open={showPlannerCodeDialog}
          onOpenChange={setShowPlannerCodeDialog}
          onSuccess={handlePlannerCodeSuccess}
          userId={userId}
        />
      )}
    </>
  );
}