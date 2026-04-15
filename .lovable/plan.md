

## Plan: Dashboard Melhorado com Dados Reais Validados

### Problemas encontrados

1. **Dados verificados no banco**: Orçamento R$1.850.000, Total Gasto R$100.689,65 (9 saídas), Entradas R$330.000 (2), 7 etapas no cronograma (6 atrasadas), 7 compras (R$84.298,90), comissões pendentes R$6.649,01, 3 contas financeiras. Todos os dados vêm do banco real -- nenhum dado é hardcoded/fake.

2. **Limitação do dashboard atual**: Só mostra dados de `obra_transacoes_fluxo` limitado a 100 registros. Se houver mais de 100 transações, o "Total Gasto" ficará incorreto. Precisa buscar soma direto do banco.

3. **Faltam informações importantes**: compras pendentes, comissões a pagar, contas bancárias, parcelas vencendo, nome da obra dinâmico.

### O que será feito

#### 1. Corrigir cálculo de totais -- usar SUM no banco
- Em vez de somar no frontend (limitado a 100 rows), criar queries separadas com `.select("valor.sum()")` ou fazer fetch sem limit para os totais
- Alternativa: usar RPC ou simplesmente remover o `.limit(100)` para os cálculos de soma, mantendo o limit só para "recentes"

#### 2. Adicionar seções novas ao dashboard
- **Compras pendentes**: total de compras, parcelas próximas do vencimento
- **Comissões**: total pendente de comissão a pagar
- **Contas bancárias**: mini resumo de saldo por conta
- **Nome da obra dinâmico**: usar `config.nome_obra` no header

#### 3. Melhorar layout visual
- Header com nome da obra e período (data_inicio - data_termino)
- Seção de "Resumo Financeiro Rápido" com gastos por categoria (top 5)
- Mini cards de compras e comissões pendentes
- Data da última transação registrada

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/DashboardPage.tsx` -- corrigir queries, adicionar seções, melhorar layout |

### Detalhes técnicos
- Fetch `obra_config` com todos os campos (nome_obra, data_termino incluídos)
- Fetch separado para totais: query sem limit com `.select("tipo, valor")` e agregar no frontend, ou duas queries separadas
- Fetch `obra_compras` para contar pendentes e parcelas vencendo
- Fetch `obra_comissao_pagamentos` para total pendente
- Fetch `obra_contas_financeiras` + transações vinculadas para saldo por conta
- Gastos por categoria: agrupar transações de saída por `categoria` no frontend

