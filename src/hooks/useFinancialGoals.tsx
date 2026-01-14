import { useState, useEffect, useCallback } from "react";
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
  annual_interest_rate: number;
  deadline: string;
  created_at: string;
  updated_at: string;
  total_contributions?: number;
}

export interface GoalFormData {
  title: string;
  initial_capital: number;
  target_amount: number;
  annual_interest_rate: number;
  deadline: Date;
}

export function useFinancialGoals(houseId: string | null) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGoals = useCallback(async () => {
    if (!houseId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("house_id", houseId)
        .order("deadline", { ascending: true });

      if (goalsError) throw goalsError;

      // Fetch all contributions for this house
      const { data: contributionsData, error: contributionsError } = await supabase
        .from("goal_contributions")
        .select("goal_id, amount")
        .eq("house_id", houseId);

      if (contributionsError) throw contributionsError;

      // Calculate total contributions per goal
      const contributionsByGoal: Record<string, number> = {};
      (contributionsData || []).forEach((c) => {
        contributionsByGoal[c.goal_id] = (contributionsByGoal[c.goal_id] || 0) + Number(c.amount);
      });

      // Merge contributions into goals
      const goalsWithContributions = (goalsData || []).map((goal) => ({
        ...goal,
        total_contributions: contributionsByGoal[goal.id] || 0,
      }));

      setGoals(goalsWithContributions);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar metas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [houseId, toast]);

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
        annual_interest_rate: data.annual_interest_rate,
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

  // Calcula aporte mensal com juros compostos
  const calculateMonthlyContributionWithInterest = (
    futureValue: number,
    presentValue: number,
    annualRate: number,
    months: number
  ): number => {
    // Sem juros ou prazo
    if (annualRate === 0 || months <= 0) {
      return months > 0 ? (futureValue - presentValue) / months : 0;
    }

    // Taxa mensal (ex: 12% ao ano = 1% ao mês)
    const monthlyRate = annualRate / 100 / 12;
    
    // Valor futuro do capital atual com juros
    const fvPresent = presentValue * Math.pow(1 + monthlyRate, months);
    
    // Valor que ainda precisa ser atingido via aportes
    const remainingFV = futureValue - fvPresent;
    
    // Se o capital atual já atinge a meta com juros
    if (remainingFV <= 0) return 0;
    
    // PMT = FV_remaining * i / ((1 + i)^n - 1)
    const pmt = remainingFV * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
    
    return pmt;
  };

  const calculateProgress = (goal: FinancialGoal) => {
    const currentCapital = Number(goal.initial_capital) + (goal.total_contributions || 0);
    const percentage = (currentCapital / goal.target_amount) * 100;
    const remaining = goal.target_amount - currentCapital;
    
    const today = new Date();
    const deadline = new Date(goal.deadline);
    
    const monthsRemaining = differenceInMonths(deadline, today);
    const daysRemaining = differenceInDays(deadline, today);
    
    // Aporte mensal sem juros (linear)
    const monthlyContributionLinear = monthsRemaining > 0 
      ? remaining / monthsRemaining 
      : remaining;

    // Aporte mensal com juros compostos
    const annualRate = goal.annual_interest_rate || 12;
    const monthlyContributionWithInterest = calculateMonthlyContributionWithInterest(
      goal.target_amount,
      currentCapital,
      annualRate,
      monthsRemaining
    );

    return {
      percentage: Math.min(percentage, 100),
      currentCapital,
      remaining: Math.max(0, remaining),
      totalContributions: goal.total_contributions || 0,
      monthsRemaining: Math.max(0, monthsRemaining),
      daysRemaining: Math.max(0, daysRemaining),
      monthlyContribution: monthsRemaining > 0 ? monthlyContributionWithInterest : 0,
      monthlyContributionLinear: monthsRemaining > 0 ? monthlyContributionLinear : 0,
      annualInterestRate: annualRate,
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
