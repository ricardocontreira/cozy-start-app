import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientDetails {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  created_at: string | null;
}

export interface CategoryExpense {
  category: string;
  total: number;
  count: number;
}

export interface MonthlyExpenses {
  total: number;
  categories: CategoryExpense[];
}

export interface ClientGoal {
  id: string;
  title: string;
  target_amount: number;
  initial_capital: number;
  annual_interest_rate: number;
  deadline: string;
  created_at: string;
  total_contributions: number;
  current_capital: number;
}

export function usePlannerClientDetails(clientId: string | null) {
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenses | null>(null);
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);

  const fetchClientDetails = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      // Fetch basic profile info
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone, birth_date, created_at")
        .eq("id", clientId)
        .single();

      if (profileError) throw profileError;

      // Fetch email via RPC
      const { data: email, error: emailError } = await supabase.rpc(
        "get_client_email",
        { client_id: clientId }
      );

      if (emailError) {
        console.error("Error fetching email:", emailError);
      }

      setClientDetails({
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        birth_date: profile.birth_date,
        created_at: profile.created_at,
        email: email || null,
      });
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast.error("Erro ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchMonthlyExpenses = useCallback(
    async (targetMonth: string) => {
      if (!clientId) return;

      setExpensesLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_client_monthly_expenses", {
          client_user_id: clientId,
          target_month: targetMonth,
        });

        if (error) throw error;

        if (data && typeof data === "object" && !Array.isArray(data)) {
          const jsonData = data as { total?: number; categories?: CategoryExpense[] };
          setMonthlyExpenses({
            total: jsonData.total || 0,
            categories: jsonData.categories || [],
          });
        } else {
          setMonthlyExpenses({ total: 0, categories: [] });
        }
      } catch (error) {
        console.error("Error fetching monthly expenses:", error);
        toast.error("Erro ao carregar gastos mensais");
        setMonthlyExpenses({ total: 0, categories: [] });
      } finally {
        setExpensesLoading(false);
      }
    },
    [clientId]
  );

  const fetchGoals = useCallback(async () => {
    if (!clientId) return;

    setGoalsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_client_financial_goals", {
        client_user_id: clientId,
      });

      if (error) throw error;

      if (Array.isArray(data)) {
        setGoals(data as unknown as ClientGoal[]);
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Erro ao carregar metas financeiras");
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  }, [clientId]);

  const reset = useCallback(() => {
    setClientDetails(null);
    setMonthlyExpenses(null);
    setGoals([]);
  }, []);

  return {
    clientDetails,
    monthlyExpenses,
    goals,
    loading,
    expensesLoading,
    goalsLoading,
    fetchClientDetails,
    fetchMonthlyExpenses,
    fetchGoals,
    reset,
  };
}
