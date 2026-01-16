import { Lock, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MemberAccessBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeaveHouse: () => void;
  houseName: string;
  ownerSubscriptionStatus?: 'active' | 'trial' | 'expired' | 'sponsored' | null;
}

export function MemberAccessBlockedDialog({
  open,
  onOpenChange,
  onLeaveHouse,
  houseName,
  ownerSubscriptionStatus,
}: MemberAccessBlockedDialogProps) {
  const getStatusMessage = () => {
    switch (ownerSubscriptionStatus) {
      case 'expired':
        return 'O período de teste ou assinatura expirou.';
      default:
        return 'O período de teste ou assinatura expirou.';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Acesso temporariamente indisponível
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <p>
              {getStatusMessage()}
            </p>
            <p className="text-sm">
              Casa: <strong>{houseName}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Aguarde o proprietário renovar a assinatura para continuar utilizando o app, 
              ou você pode optar por sair da casa e criar sua própria.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              // Don't close - user needs to wait or leave
            }}
          >
            <Clock className="w-4 h-4 mr-2" />
            Aguardar renovação
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeaveHouse}
            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sair da Casa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
