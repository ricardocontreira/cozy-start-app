import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getBillingMonth, generateInstallmentProjections, type ProjectedTransaction } from "@/lib/billingUtils";

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

interface CreditCard {
  id: string;
  closing_day: number | null;
  due_day: number | null;
}

export interface EnrichedTransaction extends Transaction {
  billingMonth: Date;
  isDeferred: boolean;
  isProjection: boolean;
  deferredMessage?: string;
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
  transactions: EnrichedTransaction[];
  rawTransactions: Transaction[];
  summary: HouseTransactionsSummary;
  isLoading: boolean;
  refetch: () => void;
}

const DEFAULT_CLOSING_DAY = 20;

export function useHouseTransactions({ houseId }: UseHouseTransactionsOptions): UseHouseTransactionsReturn {
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [cardsMap, setCardsMap] = useState<Map<string, CreditCard>>(new Map());
  const [summary, setSummary] = useState<HouseTransactionsSummary>({
    totalExpenses: 0,
    count: 0,
    byCategory: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!houseId) {
      setRawTransactions([]);
      setCardsMap(new Map());
      setSummary({ totalExpenses: 0, count: 0, byCategory: {} });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch cards and transactions in parallel
      const [cardsResult, transactionsResult] = await Promise.all([
        supabase
          .from("credit_cards")
          .select("id, closing_day, due_day")
          .eq("house_id", houseId),
        supabase
          .from("transactions")
          .select("*")
          .eq("house_id", houseId)
          .order("transaction_date", { ascending: false }),
      ]);

      if (cardsResult.error) throw cardsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      // Build cards map
      const map = new Map<string, CreditCard>();
      cardsResult.data?.forEach((card) => map.set(card.id, card));
      setCardsMap(map);

      const transactionsData = transactionsResult.data || [];
      setRawTransactions(transactionsData);

      // Calculate summary (based on raw transactions)
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
      setRawTransactions([]);
      setCardsMap(new Map());
      setSummary({ totalExpenses: 0, count: 0, byCategory: {} });
    } finally {
      setIsLoading(false);
    }
  }, [houseId]);

  // Enrich transactions with billing info and projections
  const enrichedTransactions = useMemo(() => {
    return rawTransactions.flatMap((txn): EnrichedTransaction[] => {
      const card = txn.card_id ? cardsMap.get(txn.card_id) : null;
      
      // Validar closingDay: deve estar entre 1 e 28
      const closingDay = 
        card?.closing_day && card.closing_day >= 1 && card.closing_day <= 28
          ? card.closing_day
          : DEFAULT_CLOSING_DAY;

      const billingInfo = getBillingMonth(new Date(txn.transaction_date), closingDay);

      const enriched: EnrichedTransaction = {
        ...txn,
        billingMonth: billingInfo.billingMonth,
        isDeferred: billingInfo.isDeferred,
        isProjection: false,
        deferredMessage: billingInfo.isDeferred
          ? "Esta compra foi feita após o fechamento e aparecerá na próxima fatura"
          : undefined,
      };

      // Generate projections for installments
      const projections = generateInstallmentProjections(txn, closingDay);

      return [enriched, ...projections];
    });
  }, [rawTransactions, cardsMap]);

  // Log temporário para debug - verificar projeções
  useEffect(() => {
    if (enrichedTransactions.length > 0) {
      const projections = enrichedTransactions.filter(t => t.isProjection);
      console.log(`[Debug] Total: ${enrichedTransactions.length} | Projeções: ${projections.length}`);
      
      // Mostrar primeiras 5 projeções como exemplo
      projections.slice(0, 5).forEach(p => {
        console.log(
          `  → ${p.description} | ${p.installment} | Billing: ${format(p.billingMonth, "MMM/yyyy", { locale: ptBR })}`
        );
      });
    }
  }, [enrichedTransactions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    transactions: enrichedTransactions,
    rawTransactions,
    summary,
    isLoading,
    refetch: fetchData,
  };
}
