import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInMonths, differenceInDays } from "date-fns";

export interface FinancialGoal {
  id: string;
  house_id: string;
  user_id: string;
  title: string;
  initial_capital: number;
  target_amount: number;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export interface GoalFormData {
  title: string;
  initial_capital: number;
  target_amount: number;
  deadline: Date;
}

export function useFinancialGoals(houseId: string | null) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGoals = async () => {
    if (!houseId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("house_id", houseId)
        .order("deadline", { ascending: true });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar metas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [houseId]);

  const createGoal = async (data: GoalFormData, userId: string) => {
    if (!houseId) return false;

    try {
      const { error } = await supabase.from("financial_goals").insert({
        house_id: houseId,
        user_id: userId,
        title: data.title,
        initial_capital: data.initial_capital,
        target_amount: data.target_amount,
        deadline: data.deadline.toISOString().split("T")[0],
      });

      if (error) throw error;

      toast({
        title: "Meta criada!",
        description: "Sua meta financeira foi criada com sucesso.",
      });

      await fetchGoals();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGoal = async (goalId: string, data: Partial<GoalFormData>) => {
    try {
      const updateData: any = { ...data };
      if (data.deadline) {
        updateData.deadline = data.deadline.toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("financial_goals")
        .update(updateData)
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Meta atualizada!",
        description: "Sua meta foi atualizada com sucesso.",
      });

      await fetchGoals();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar meta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("financial_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Meta excluída",
        description: "Sua meta foi removida com sucesso.",
      });

      await fetchGoals();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao excluir meta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const calculateProgress = (goal: FinancialGoal) => {
    const percentage = (goal.initial_capital / goal.target_amount) * 100;
    const remaining = goal.target_amount - goal.initial_capital;
    
    const today = new Date();
    const deadline = new Date(goal.deadline);
    
    const monthsRemaining = differenceInMonths(deadline, today);
    const daysRemaining = differenceInDays(deadline, today);
    
    const monthlyContribution = monthsRemaining > 0 
      ? remaining / monthsRemaining 
      : remaining;

    return {
      percentage: Math.min(percentage, 100),
      remaining,
      monthsRemaining: Math.max(0, monthsRemaining),
      daysRemaining: Math.max(0, daysRemaining),
      monthlyContribution: monthsRemaining > 0 ? monthlyContribution : 0,
      isCompleted: percentage >= 100,
      isOverdue: daysRemaining < 0,
    };
  };

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    calculateProgress,
    refetch: fetchGoals,
  };
}
