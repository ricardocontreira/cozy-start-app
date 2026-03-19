

## Plano: Dialog de detalhes ao clicar no mês

### O que será feito

Ao clicar em uma linha da tabela de detalhamento mensal, abrir um **Dialog** mostrando todas as transações daquele mês, separadas em duas seções: **Receitas** e **Despesas**, com descrição, data e valor de cada uma.

### Alterações em `src/pages/AnnualOverview.tsx`

1. **Estado para mês selecionado** — Adicionar `selectedMonth: number | null` para controlar qual mês está aberto no dialog.

2. **Filtrar transações do mês** — Usar `useMemo` para filtrar `transactions` pelo `selectedYear` e `selectedMonth`, separando em receitas e despesas.

3. **Tornar linhas clicáveis** — Adicionar `onClick` e `cursor-pointer` nas linhas `<tr>` que têm dados (`hasData`), setando o `selectedMonth`.

4. **Dialog com detalhes** — Usar o componente `Dialog` existente para exibir:
   - Título: nome do mês e ano (ex: "Janeiro/2026")
   - Seção "Receitas" com lista de transações (descrição, data, valor em verde)
   - Seção "Despesas" com lista de transações (descrição, categoria, data, valor em vermelho)
   - Totais de cada seção no rodapé
   - ScrollArea para quando houver muitas transações

### Detalhes técnicos

- Reutilizar dados de `transactions` (do `useHouseTransactions`) já carregados — sem queries adicionais
- Importar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` dos componentes UI existentes
- Importar `ScrollArea` para scroll interno
- Formatar datas com `format` do date-fns em pt-BR

