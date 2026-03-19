

## Plano: Reduzir altura do cabeçalho da tabela de detalhamento mensal

### Alteração

No arquivo `src/pages/AnnualOverview.tsx`:

1. **CardHeader** (linha 194): Reduzir padding — mudar de `pb-2` para `pb-1 pt-3`
2. **CardTitle** (linha 195): Reduzir tamanho do texto — mudar de `text-lg` para `text-base`
3. **Cabeçalhos da tabela** (linhas 209-212): Reduzir padding vertical — mudar `py-2` para `py-1` e usar `text-xs` ao invés do tamanho padrão

Isso tornará o cabeçalho mais compacto e alinhado com o layout mobile.

