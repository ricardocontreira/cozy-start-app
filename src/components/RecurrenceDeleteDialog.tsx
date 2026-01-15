import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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

export type RecurrenceDeleteType = "single" | "future";

interface RecurrenceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteType: RecurrenceDeleteType) => Promise<void>;
  futureCount?: number;
}

export function RecurrenceDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  futureCount = 0,
}: RecurrenceDeleteDialogProps) {
  const [deleteType, setDeleteType] = useState<RecurrenceDeleteType>("single");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(deleteType);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Excluir Transação Recorrente
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta transação faz parte de uma série recorrente. O que deseja excluir?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={deleteType}
          onValueChange={(value) => setDeleteType(value as RecurrenceDeleteType)}
          className="space-y-3 py-4"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
            <RadioGroupItem value="single" id="delete-single" className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="delete-single" className="font-medium cursor-pointer">
                Apenas esta transação
              </Label>
              <p className="text-sm text-muted-foreground">
                As demais transações permanecerão ativas
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
            <RadioGroupItem value="future" id="delete-future" className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="delete-future" className="font-medium cursor-pointer">
                Esta e todas as futuras
              </Label>
              <p className="text-sm text-muted-foreground">
                {futureCount > 0
                  ? `${futureCount} transações serão excluídas`
                  : "Todas as transações futuras serão excluídas"}
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
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
