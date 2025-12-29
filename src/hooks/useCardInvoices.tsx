import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, isAfter, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Invoice {
  key: string; // YYYY-MM format
  label: string; // "Dezembro 2025"
  billingMonth: Date;
  total: number;
  count: number;
  status: "current" | "future" | "closed";
}

interface UseCardInvoicesOptions {
  cardId: string;
  houseId: string;
}

export function useCardInvoices({ cardId, houseId }: UseCardInvoicesOptions) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (!cardId || !houseId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("billing_month, amount")
        .eq("card_id", cardId)
        .eq("house_id", houseId)
        .not("billing_month", "is", null);

      if (error) throw error;

      // Group transactions by billing_month
      const grouped: Record<string, { total: number; count: number; date: Date }> = {};

      data?.forEach((txn) => {
        if (!txn.billing_month) return;
        
        const key = txn.billing_month.substring(0, 7); // YYYY-MM
        if (!grouped[key]) {
          grouped[key] = {
            total: 0,
            count: 0,
            date: parseISO(txn.billing_month),
          };
        }
        grouped[key].total += Number(txn.amount);
        grouped[key].count += 1;
      });

      // Convert to array and determine status
      const now = new Date();
      const currentMonth = startOfMonth(now);

      const invoicesList: Invoice[] = Object.entries(grouped)
        .map(([key, data]) => {
          const billingMonth = startOfMonth(data.date);
          let status: Invoice["status"] = "closed";
          
          if (isSameMonth(billingMonth, currentMonth)) {
            status = "current";
          } else if (isAfter(billingMonth, currentMonth)) {
            status = "future";
          }

          return {
            key,
            label: format(billingMonth, "MMMM yyyy", { locale: ptBR }),
            billingMonth,
            total: data.total,
            count: data.count,
            status,
          };
        })
        .sort((a, b) => b.billingMonth.getTime() - a.billingMonth.getTime());

      setInvoices(invoicesList);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, houseId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    refreshInvoices: fetchInvoices,
  };
}
