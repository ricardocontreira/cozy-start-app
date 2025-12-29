import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface BillingInfo {
  billingMonth: Date;
  billingLabel: string;
  isDeferred: boolean;
}

export interface ProjectedTransaction {
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
  billingMonth: Date;
  isProjection: boolean;
  isDeferred: boolean;
  deferredMessage?: string;
}

/**
 * Calcula o mês de cobrança baseado na data da compra e dia de fechamento
 * 
 * Regra: Se dia da compra > dia de fechamento, a compra vai para o mês seguinte
 */
export function getBillingMonth(
  purchaseDate: Date,
  closingDay: number
): BillingInfo {
  const purchaseDay = purchaseDate.getDate();
  const purchaseMonth = purchaseDate.getMonth();
  const purchaseYear = purchaseDate.getFullYear();

  if (purchaseDay > closingDay) {
    // Compra após fechamento -> mês seguinte
    const nextMonth = purchaseMonth === 11 ? 0 : purchaseMonth + 1;
    const nextYear = purchaseMonth === 11 ? purchaseYear + 1 : purchaseYear;
    return {
      billingMonth: new Date(nextYear, nextMonth, 1),
      billingLabel: format(new Date(nextYear, nextMonth, 1), "MMMM 'de' yyyy", { locale: ptBR }),
      isDeferred: true,
    };
  }

  // Compra antes do fechamento -> mês atual
  return {
    billingMonth: new Date(purchaseYear, purchaseMonth, 1),
    billingLabel: format(new Date(purchaseYear, purchaseMonth, 1), "MMMM 'de' yyyy", { locale: ptBR }),
    isDeferred: false,
  };
}

/**
 * Gera projeções de parcelas futuras
 * 
 * Exemplo: Compra parcelada em 6x, parcela atual 2/6
 * Gera parcelas 3/6, 4/6, 5/6, 6/6 com meses de cobrança incrementais
 */
export function generateInstallmentProjections(
  transaction: {
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
  },
  closingDay: number
): ProjectedTransaction[] {
  const installmentMatch = transaction.installment?.match(/(\d+)\/(\d+)/);
  if (!installmentMatch) return [];

  const currentInstallment = parseInt(installmentMatch[1]);
  const totalInstallments = parseInt(installmentMatch[2]);

  // Se já é a última parcela, não gera projeções
  if (currentInstallment >= totalInstallments) return [];

  const projections: ProjectedTransaction[] = [];
  const baseBilling = getBillingMonth(new Date(transaction.transaction_date), closingDay);

  for (let i = currentInstallment + 1; i <= totalInstallments; i++) {
    const monthsAhead = i - currentInstallment;
    const projectedBillingMonth = addMonths(baseBilling.billingMonth, monthsAhead);

    projections.push({
      ...transaction,
      id: `${transaction.id}_projected_${i}`,
      installment: `${i}/${totalInstallments}`,
      isProjection: true,
      billingMonth: projectedBillingMonth,
      isDeferred: false,
      deferredMessage: undefined,
    });
  }

  return projections;
}
