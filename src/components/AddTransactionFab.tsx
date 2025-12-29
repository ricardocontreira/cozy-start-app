import { useState } from "react";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { AddIncomeDialog } from "./AddIncomeDialog";

interface AddTransactionFabProps {
  onSuccess?: () => void;
}

export function AddTransactionFab({ onSuccess }: AddTransactionFabProps) {
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => setExpenseDialogOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 text-destructive" />
              Nova Despesa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIncomeDialogOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-success" />
              Nova Receita
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={onSuccess}
      />
      <AddIncomeDialog
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}