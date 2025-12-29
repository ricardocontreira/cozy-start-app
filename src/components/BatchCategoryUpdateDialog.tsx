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
import { getCategoryStyle } from "@/lib/categories";

interface BatchCategoryUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  newCategory: string;
  count: number;
  onUpdateAll: () => void;
  onUpdateSingle: () => void;
  isUpdating: boolean;
}

export function BatchCategoryUpdateDialog({
  open,
  onOpenChange,
  description,
  newCategory,
  count,
  onUpdateAll,
  onUpdateSingle,
  isUpdating,
}: BatchCategoryUpdateDialogProps) {
  const categoryStyle = getCategoryStyle(newCategory);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualizar categoria em lote?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Encontramos{" "}
              <span className="font-semibold text-foreground">{count} outras transações</span>{" "}
              de{" "}
              <span className="font-semibold text-foreground">"{description}"</span>.
            </p>
            <p>
              Deseja atualizar todas para{" "}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}
              >
                {categoryStyle.icon} {newCategory}
              </span>
              ?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onUpdateSingle();
            }}
            disabled={isUpdating}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Apenas esta
          </AlertDialogAction>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onUpdateAll();
            }}
            disabled={isUpdating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Atualizar todas ({count + 1})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
