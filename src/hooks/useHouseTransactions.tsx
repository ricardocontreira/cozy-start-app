import { useState, useEffect, useCallback, useMemo } from "react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getBillingMonth } from "@/lib/billingUtils";

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
  billing_month: string | null;
  type: "expense" | "income";
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

      const transactionsData = (transactionsResult.data || []).map(txn => ({
        ...txn,
        type: (txn.type || "expense") as "expense" | "income",
      }));
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

      // CORREÇÃO: Usar billing_month do banco como fonte de verdade
      // Se billing_month existe, usar ele; senão, calcular a partir de transaction_date
      let baseBillingMonth: Date;
      let isDeferred = false;

      if (txn.billing_month) {
        // Normalizar para evitar problemas de timezone: criar Date com ano/mês explícitos
        const [year, month] = txn.billing_month.split('-').map(Number);
        baseBillingMonth = new Date(year, month - 1, 1);
      } else {
        const billingInfo = getBillingMonth(new Date(txn.transaction_date), closingDay);
        baseBillingMonth = billingInfo.billingMonth;
        isDeferred = billingInfo.isDeferred;
      }

      const enriched: EnrichedTransaction = {
        ...txn,
        billingMonth: baseBillingMonth,
        isDeferred,
        isProjection: false,
        deferredMessage: isDeferred
          ? "Esta compra foi feita após o fechamento e aparecerá na próxima fatura"
          : undefined,
      };

      // Gerar projeções ancoradas no baseBillingMonth (mês de inserção)
      const projections: EnrichedTransaction[] = [];

      if (txn.installment && txn.installment.trim() !== "") {
        const match = txn.installment.trim().match(/^(\d+)\/(\d+)$/);
        if (match) {
          const currentInstallment = parseInt(match[1], 10);
          const totalInstallments = parseInt(match[2], 10);

          if (
            !isNaN(currentInstallment) &&
            !isNaN(totalInstallments) &&
            currentInstallment > 0 &&
            totalInstallments > 0 &&
            currentInstallment < totalInstallments
          ) {
            // Gerar parcelas de (X+1) até Y, ancoradas no baseBillingMonth
            for (let i = currentInstallment + 1; i <= totalInstallments; i++) {
              const monthsAhead = i - currentInstallment;
              const projectedBillingMonth = addMonths(baseBillingMonth, monthsAhead);

              projections.push({
                ...txn,
                id: `${txn.id}_projected_${i}`,
                installment: `${i}/${totalInstallments}`,
                billingMonth: projectedBillingMonth,
                isProjection: true,
                isDeferred: false,
                deferredMessage: undefined,
              });
            }
          }
        }
      }

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
