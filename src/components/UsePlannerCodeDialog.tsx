import { useState, useEffect } from "react";
import { Loader2, UserCheck, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteValidation {
  valid: boolean;
  checking: boolean;
  plannerName?: string;
  plannerId?: string;
}

interface UsePlannerCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

export function UsePlannerCodeDialog({
  open,
  onOpenChange,
  onSuccess,
  userId,
}: UsePlannerCodeDialogProps) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [validation, setValidation] = useState<InviteValidation>({
    valid: false,
    checking: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Validate invite code with debounce
  useEffect(() => {
    const validateInviteCode = async (code: string) => {
      if (!code || code.length < 8) {
        setValidation({ valid: false, checking: false });
        return;
      }

      setValidation((prev) => ({ ...prev, checking: true }));

      try {
        const { data, error } = await supabase.rpc("validate_invite_code", { code });

        if (error) throw error;

        const result = data as unknown as {
          valid: boolean;
          planner_name?: string;
          planner_id?: string;
        };

        if (result?.valid) {
          setValidation({
            valid: true,
            plannerName: result.planner_name,
            plannerId: result.planner_id,
            checking: false,
          });
        } else {
          setValidation({ valid: false, checking: false });
        }
      } catch (error) {
        console.error("Error validating invite code:", error);
        setValidation({ valid: false, checking: false });
      }
    };

    const timer = setTimeout(() => {
      if (inviteCode) {
        validateInviteCode(inviteCode);
      } else {
        setValidation({ valid: false, checking: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const handleSubmit = async () => {
    if (!validation.valid || !userId) return;

    setSubmitting(true);
    try {
      const result = await supabase.rpc("use_planner_invite", {
        code: inviteCode,
        client_user_id: userId,
      });

      if (result.error) throw result.error;

      toast({
        title: "Código aplicado!",
        description: `Você agora está vinculado ao planejador ${validation.plannerName}.`,
      });

      setInviteCode("");
      setValidation({ valid: false, checking: false });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error using planner invite:", error);
      toast({
        title: "Erro",
        description: "Não foi possível usar o código. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setInviteCode("");
    setValidation({ valid: false, checking: false });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Usar Código do Planejador</DialogTitle>
          <DialogDescription className="text-center">
            Se você recebeu um código de um planejador financeiro, insira-o abaixo para
            ter acesso ao FinLar Pro sem custo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Código do Planejador</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABC12345"
              maxLength={8}
              className="text-center font-mono text-lg tracking-widest uppercase"
            />
            <div className="min-h-[20px]">
              {validation.checking && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Validando...
                </p>
              )}
              {validation.valid && validation.plannerName && (
                <p className="text-sm text-primary flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Planejador: {validation.plannerName}
                </p>
              )}
              {inviteCode &&
                inviteCode.length >= 8 &&
                !validation.valid &&
                !validation.checking && (
                  <p className="text-sm text-destructive">Código inválido ou expirado</p>
                )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validation.valid || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              "Aplicar Código"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
