import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type RecurrenceUpdateType = "single" | "future";

interface RecurrenceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (updateType: RecurrenceUpdateType) => Promise<void>;
  futureCount?: number;
}

export function RecurrenceUpdateDialog({
  open,
  onOpenChange,
  onConfirm,
  futureCount = 0,
}: RecurrenceUpdateDialogProps) {
  const [updateType, setUpdateType] = useState<RecurrenceUpdateType>("single");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(updateType);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualizar Transação Recorrente</AlertDialogTitle>
          <AlertDialogDescription>
            Esta transação faz parte de uma série recorrente. Como deseja aplicar as alterações?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={updateType}
          onValueChange={(value) => setUpdateType(value as RecurrenceUpdateType)}
          className="space-y-3 py-4"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
            <RadioGroupItem value="single" id="update-single" className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="update-single" className="font-medium cursor-pointer">
                Apenas esta transação
              </Label>
              <p className="text-sm text-muted-foreground">
                As demais transações permanecerão iguais
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
            <RadioGroupItem value="future" id="update-future" className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="update-future" className="font-medium cursor-pointer">
                Esta e todas as futuras
              </Label>
              <p className="text-sm text-muted-foreground">
                {futureCount > 0
                  ? `${futureCount} transações serão atualizadas`
                  : "Todas as transações futuras serão atualizadas"}
              </p>
            </div>
          </div>
        </RadioGroup>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
