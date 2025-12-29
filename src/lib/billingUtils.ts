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
 * Exemplo: Compra parcelada em 10x, parcela atual 05/10
 * Gera parcelas 06/10, 07/10, 08/10, 09/10, 10/10 com meses de cobrança incrementais
 * 
 * Regra: Parcela X/Y em mês M -> Próximas parcelas são X+1, X+2... até Y
 *        Cada parcela futura é adicionada +1 mês a partir do billing da parcela original
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
  closingDay: number,
  referenceDate: Date = new Date()
): ProjectedTransaction[] {
  // 1. Validação inicial - campo vazio ou nulo
  if (!transaction.installment || transaction.installment.trim() === "") {
    return [];
  }

  // 2. Regex com âncoras para match exato do formato X/Y
  const trimmedInstallment = transaction.installment.trim();
  const installmentMatch = trimmedInstallment.match(/^(\d+)\/(\d+)$/);

  if (!installmentMatch) {
    console.warn(`[Billing] Formato inválido de parcela: "${transaction.installment}"`);
    return [];
  }

  // 3. parseInt com radix 10 EXPLÍCITO para evitar problemas com zeros à esquerda
  const currentInstallment = parseInt(installmentMatch[1], 10);
  const totalInstallments = parseInt(installmentMatch[2], 10);

  // 4. Validações de sanidade
  if (isNaN(currentInstallment) || isNaN(totalInstallments)) {
    console.warn(`[Billing] Parcela com NaN: ${transaction.installment}`);
    return [];
  }

  if (currentInstallment <= 0 || totalInstallments <= 0) {
    console.warn(`[Billing] Parcela com valor <= 0: ${transaction.installment}`);
    return [];
  }

  if (currentInstallment > totalInstallments) {
    console.warn(`[Billing] Parcela atual > total: ${transaction.installment}`);
    return [];
  }

  // 5. Se já é a última parcela, não gera projeções
  if (currentInstallment >= totalInstallments) {
    return [];
  }

  const projections: ProjectedTransaction[] = [];
  const baseBilling = getBillingMonth(new Date(transaction.transaction_date), closingDay);

  // 6. Loop: gera parcelas de (X+1) até Y
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

  // 7. Filtrar projeções passadas (manter apenas >= mês atual)
  const currentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const filteredProjections = projections.filter(proj => proj.billingMonth >= currentMonth);

  console.log(
    `[Billing] ${transaction.description}: ${currentInstallment}/${totalInstallments} ` +
    `| Base: ${format(baseBilling.billingMonth, "MMM/yyyy", { locale: ptBR })} ` +
    `| Geradas: ${projections.length} | Após filtro (>= ${format(currentMonth, "MMM/yyyy", { locale: ptBR })}): ${filteredProjections.length}`
  );

  return filteredProjections;
}
