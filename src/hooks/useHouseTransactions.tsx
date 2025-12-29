import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  category: string | null;
  installment: string | null;
  card_id: string | null;
  house_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface HouseTransactionsSummary {
  totalExpenses: number;
  count: number;
  byCategory: Record<string, { total: number; count: number }>;
}

interface UseHouseTransactionsOptions {
  houseId: string | undefined;
}

interface UseHouseTransactionsReturn {
  transactions: Transaction[];
  summary: HouseTransactionsSummary;
  isLoading: boolean;
  refetch: () => void;
}

export function useHouseTransactions({ houseId }: UseHouseTransactionsOptions): UseHouseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<HouseTransactionsSummary>({
    totalExpenses: 0,
    count: 0,
    byCategory: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!houseId) {
      setTransactions([]);
      setSummary({ totalExpenses: 0, count: 0, byCategory: {} });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("house_id", houseId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      const transactionsData = data || [];
      setTransactions(transactionsData);

      // Calculate summary
      const byCategory: Record<string, { total: number; count: number }> = {};
      let totalExpenses = 0;

      transactionsData.forEach((txn) => {
        const amount = Number(txn.amount);
        totalExpenses += amount;

        const category = txn.category || "Não classificado";
        if (!byCategory[category]) {
          byCategory[category] = { total: 0, count: 0 };
        }
        byCategory[category].total += amount;
        byCategory[category].count += 1;
      });

      setSummary({
        totalExpenses,
        count: transactionsData.length,
        byCategory,
      });
    } catch (error) {
      console.error("Error fetching house transactions:", error);
      setTransactions([]);
      setSummary({ totalExpenses: 0, count: 0, byCategory: {} });
    } finally {
      setIsLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    summary,
    isLoading,
    refetch: fetchTransactions,
  };
}
