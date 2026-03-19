

## Plano: Visão Financeira Anual

### O que será feito

1. **Atalho no Dashboard** — Adicionar um card clicável "Visão Financeira Anual" na Dashboard (entre os cards de resumo e os aportes), com ícone de gráfico e seta, que redireciona para `/annual-overview`.

2. **Nova página `/annual-overview`** — Criar `src/pages/AnnualOverview.tsx` com:
   - Header com botão voltar e seletor de ano
   - Gráfico de barras (Recharts `BarChart`) com 12 meses (Jan-Dez) mostrando barras de **Receitas** (verde) e **Despesas** (vermelho) lado a lado
   - Cards de resumo: Total Receitas, Total Despesas e Saldo do ano
   - Tabela simples com os valores mês a mês
   - Os dados virão do hook `useHouseTransactions` já existente, filtrando por ano e agrupando por mês

3. **Rota no App.tsx** — Adicionar `<Route path="/annual-overview" element={<AnnualOverview />} />`.

### Detalhes técnicos

- Reutilizar `useHouseTransactions` que já retorna todas as transações enriquecidas com `billingMonth`
- Agrupar transações por mês do `billingMonth` e separar por `type` ("expense" vs "income")
- Usar `BarChart` do Recharts (já instalado no projeto) com `Bar` para receitas e despesas
- O seletor de ano permite navegar entre anos (padrão: ano atual)
- Layout responsivo com `MobileBottomNav`

