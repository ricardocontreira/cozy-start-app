import { Lock } from "lucide-react";
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
}

export function MemberAccessBlockedDialog({
  open,
  onOpenChange,
  onLeaveHouse,
  houseName,
}: MemberAccessBlockedDialogProps) {
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
          <AlertDialogDescription className="text-center">
            O período de teste ou assinatura da casa <strong>{houseName}</strong> expirou.
            <br /><br />
            Aguarde o proprietário renovar a assinatura para continuar utilizando o app, 
            ou você pode optar por sair da casa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Entendi
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
