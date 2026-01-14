import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, Trash2, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FinancialGoal } from "@/hooks/useFinancialGoals";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: FinancialGoal;
  progress: {
    percentage: number;
    remaining: number;
    monthsRemaining: number;
    daysRemaining: number;
    monthlyContribution: number;
    isCompleted: boolean;
    isOverdue: boolean;
  };
  onDelete: (goalId: string) => Promise<boolean>;
  isOwner: boolean;
}

export function GoalCard({ goal, progress, onDelete, isOwner }: GoalCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = () => {
    if (progress.isCompleted) return "text-green-600";
    if (progress.isOverdue) return "text-red-600";
    if (progress.percentage >= 75) return "text-primary";
    if (progress.percentage >= 50) return "text-yellow-600";
    return "text-muted-foreground";
  };

  const getProgressColor = () => {
    if (progress.isCompleted) return "bg-green-500";
    if (progress.isOverdue) return "bg-red-500";
    return "bg-primary";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{goal.title}</CardTitle>
          </div>
          
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A meta "{goal.title}" será permanentemente excluída.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(goal.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn("font-medium", getStatusColor())}>
              {progress.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={progress.percentage} 
              className="h-3"
            />
            <div 
              className={cn("absolute inset-0 h-3 rounded-full transition-all", getProgressColor())}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Capital Atual</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(goal.initial_capital)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Meta</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(goal.target_amount)}
            </p>
          </div>
        </div>

        {/* Remaining */}
        {!progress.isCompleted && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Faltam:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(progress.remaining)}
              </span>
            </div>
            
            {progress.monthsRemaining > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Aporte mensal necessário:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(progress.monthlyContribution)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Deadline */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Prazo</span>
          <span className={cn("font-medium", progress.isOverdue ? "text-red-600" : "text-foreground")}>
            {format(new Date(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {progress.monthsRemaining > 0 && !progress.isCompleted && (
              <span className="text-muted-foreground ml-1">
                ({progress.monthsRemaining} {progress.monthsRemaining === 1 ? "mês" : "meses"})
              </span>
            )}
            {progress.isOverdue && (
              <span className="text-red-600 ml-1">(vencida)</span>
            )}
          </span>
        </div>

        {/* Completed Badge */}
        {progress.isCompleted && (
          <div className="p-3 rounded-lg bg-green-500/10 text-green-700 text-center font-medium">
            🎉 Meta alcançada!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
