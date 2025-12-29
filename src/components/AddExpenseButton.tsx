import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";

interface AddExpenseButtonProps {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost" | "fab";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddExpenseButton({
  onSuccess,
  variant = "default",
  size = "default",
  className,
}: AddExpenseButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (variant === "fab") {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
        <AddExpenseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={onSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant={variant}
        size={size}
        className={className}
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Despesa
      </Button>
      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
