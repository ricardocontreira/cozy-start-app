import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  category: string | null;
  installment: string | null;
  card_id: string | null;
  upload_id: string | null;
}

export interface TransactionSummary {
  total: number;
  count: number;
  byCategory: Record<string, { total: number; count: number }>;
}

interface UseCardTransactionsOptions {
  cardId: string;
  houseId: string;
}

type SortField = "date" | "amount";
type SortOrder = "asc" | "desc";

export function useCardTransactions({ cardId, houseId }: UseCardTransactionsOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [summary, setSummary] = useState<TransactionSummary>({
    total: 0,
    count: 0,
    byCategory: {},
  });

  const fetchTransactions = useCallback(async () => {
    if (!cardId || !houseId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("card_id", cardId)
        .eq("house_id", houseId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      const txns = data || [];
      setTransactions(txns);

      // Calculate summary
      const summaryData: TransactionSummary = {
        total: 0,
        count: txns.length,
        byCategory: {},
      };

      txns.forEach((txn) => {
        summaryData.total += Number(txn.amount);
        const cat = txn.category || "Não classificado";
        if (!summaryData.byCategory[cat]) {
          summaryData.byCategory[cat] = { total: 0, count: 0 };
        }
        summaryData.byCategory[cat].total += Number(txn.amount);
        summaryData.byCategory[cat].count += 1;
      });

      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, houseId]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...transactions];

    // Apply category filter
    if (categoryFilter) {
      result = result.filter((txn) => txn.category === categoryFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.transaction_date).getTime();
        const dateB = new Date(b.transaction_date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === "desc"
          ? Number(b.amount) - Number(a.amount)
          : Number(a.amount) - Number(b.amount);
      }
    });

    setFilteredTransactions(result);
  }, [transactions, categoryFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filterByCategory = useCallback((category: string | null) => {
    setCategoryFilter(category);
  }, []);

  const sortBy = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }, [sortField]);

  const categories = Object.keys(summary.byCategory);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    summary,
    categories,
    isLoading,
    categoryFilter,
    sortField,
    sortOrder,
    filterByCategory,
    sortBy,
    refreshTransactions: fetchTransactions,
  };
}
