import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AddGoalDialog } from "@/components/AddGoalDialog";
import { GoalCard } from "@/components/GoalCard";
import { useAuth } from "@/hooks/useAuth";
import { useHouse } from "@/hooks/useHouse";
import { useFinancialGoals, GoalFormData } from "@/hooks/useFinancialGoals";
import { useState } from "react";

export default function Planning() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentHouse, memberRole, loading: houseLoading } = useHouse();
  const { goals, loading: goalsLoading, createGoal, deleteGoal, calculateProgress } = useFinancialGoals(currentHouse?.id || null);
  
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOwner = memberRole === "owner";
  const isLoading = authLoading || houseLoading || goalsLoading;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!houseLoading && !currentHouse && user) {
      navigate("/house-setup");
    }
  }, [currentHouse, houseLoading, user, navigate]);

  const handleCreateGoal = async (data: GoalFormData) => {
    if (!user) return false;
    return await createGoal(data, user.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Metas Financeiras</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Add Goal Button (Owner Only) */}
        {isOwner && (
          <Button 
            onClick={() => setDialogOpen(true)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Meta
          </Button>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhuma meta cadastrada</h2>
            <p className="text-muted-foreground max-w-sm">
              {isOwner 
                ? "Comece a planejar seu futuro financeiro criando sua primeira meta de economia."
                : "O proprietário da casa ainda não criou nenhuma meta financeira."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={calculateProgress(goal)}
                onDelete={deleteGoal}
                isOwner={isOwner}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Goal Dialog */}
      <AddGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateGoal}
      />

      {/* Mobile Navigation */}
      <MobileBottomNav activeRoute="planning" />
    </div>
  );
}
