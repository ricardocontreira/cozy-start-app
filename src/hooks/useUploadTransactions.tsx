import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UploadTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  category: string | null;
  installment: string | null;
  billing_month: string | null;
}

interface UseUploadTransactionsOptions {
  uploadId: string | null;
  houseId: string;
}

export function useUploadTransactions({ uploadId, houseId }: UseUploadTransactionsOptions) {
  const [transactions, setTransactions] = useState<UploadTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    if (!uploadId || !houseId) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, transaction_date, category, installment, billing_month")
        .eq("upload_id", uploadId)
        .eq("house_id", houseId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching upload transactions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [uploadId, houseId, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    if (!uploadId) return false;

    setIsDeleting(transactionId);
    try {
      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (deleteError) throw deleteError;

      // Decrement items_count in upload_logs
      const { data: uploadLog } = await supabase
        .from("upload_logs")
        .select("items_count")
        .eq("id", uploadId)
        .single();

      if (uploadLog) {
        await supabase
          .from("upload_logs")
          .update({ items_count: Math.max(0, (uploadLog.items_count || 1) - 1) })
          .eq("id", uploadId);
      }

      // Update local state
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));

      toast({
        title: "Transação removida",
        description: "A transação foi excluída com sucesso.",
      });

      return true;
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover a transação.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(null);
    }
  };

  return {
    transactions,
    isLoading,
    isDeleting,
    deleteTransaction,
    refreshTransactions: fetchTransactions,
  };
}
