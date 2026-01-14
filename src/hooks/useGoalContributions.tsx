import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GoalContribution {
  id: string;
  goal_id: string;
  house_id: string;
  user_id: string;
  description: string;
  amount: number;
  contribution_date: string;
  created_at: string;
  updated_at: string;
  goal?: {
    id: string;
    title: string;
  };
}

export interface ContributionFormData {
  goal_id: string;
  description: string;
  amount: number;
  contribution_date: Date;
}

export function useGoalContributions(houseId: string | null) {
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContributions = useCallback(async () => {
    if (!houseId) {
      setContributions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("goal_contributions")
        .select(`
          *,
          goal:financial_goals(id, title)
        `)
        .eq("house_id", houseId)
        .order("contribution_date", { ascending: false });

      if (error) throw error;

      setContributions(data || []);
    } catch (error: any) {
      console.error("Error fetching contributions:", error);
      toast.error("Erro ao carregar aportes");
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const createContribution = async (
    data: ContributionFormData,
    userId: string
  ): Promise<boolean> => {
    if (!houseId) return false;

    try {
      const { error } = await supabase.from("goal_contributions").insert({
        goal_id: data.goal_id,
        house_id: houseId,
        user_id: userId,
        description: data.description,
        amount: data.amount,
        contribution_date: data.contribution_date.toISOString().split("T")[0],
      });

      if (error) throw error;

      toast.success("Aporte registrado com sucesso!");
      await fetchContributions();
      return true;
    } catch (error: any) {
      console.error("Error creating contribution:", error);
      toast.error("Erro ao registrar aporte");
      return false;
    }
  };

  const deleteContribution = async (contributionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("goal_contributions")
        .delete()
        .eq("id", contributionId);

      if (error) throw error;

      toast.success("Aporte excluído com sucesso!");
      await fetchContributions();
      return true;
    } catch (error: any) {
      console.error("Error deleting contribution:", error);
      toast.error("Erro ao excluir aporte");
      return false;
    }
  };

  const getContributionsByGoal = useCallback(
    (goalId: string): GoalContribution[] => {
      return contributions.filter((c) => c.goal_id === goalId);
    },
    [contributions]
  );

  const getTotalByGoal = useCallback(
    (goalId: string): number => {
      return contributions
        .filter((c) => c.goal_id === goalId)
        .reduce((sum, c) => sum + Number(c.amount), 0);
    },
    [contributions]
  );

  const getContributionsByMonth = useCallback(
    (year: number, month: number): GoalContribution[] => {
      return contributions.filter((c) => {
        const date = new Date(c.contribution_date);
        return date.getFullYear() === year && date.getMonth() === month;
      });
    },
    [contributions]
  );

  const getTotalByMonth = useCallback(
    (year: number, month: number): number => {
      return getContributionsByMonth(year, month).reduce(
        (sum, c) => sum + Number(c.amount),
        0
      );
    },
    [getContributionsByMonth]
  );

  return {
    contributions,
    loading,
    createContribution,
    deleteContribution,
    getContributionsByGoal,
    getTotalByGoal,
    getContributionsByMonth,
    getTotalByMonth,
    refetch: fetchContributions,
  };
}
