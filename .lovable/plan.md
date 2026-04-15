

## Plan: Sistema de Comissão Avançado

### Problema atual
A página de comissão mostra apenas uma lista simples de pagamentos sem contexto. Não mostra a origem de cada comissão (qual transação/compra gerou), não tem acompanhamento mensal comparativo, e não permite gestão detalhada.

### O que já existe no banco
A tabela `obra_comissao_pagamentos` já tem campo `observacoes` que contém a referência (ex: "NF 167970 - CONSTRUNORTE") e campo `mes` para agrupamento mensal. As transações em `obra_transacoes_fluxo` têm `categoria`, `descricao`, `origem_tipo`.

### Mudanças

#### 1. Migração: adicionar campos de rastreabilidade
Adicionar à tabela `obra_comissao_pagamentos`:
- `transacao_id uuid` -- vínculo direto com a transação que gerou a comissão
- `categoria text` -- categoria da transação de origem
- `fornecedor text` -- fornecedor de origem
- `forma_pagamento text` -- como foi pago

#### 2. Reescrever ComissaoPage com 3 seções

**Seção A -- KPIs (melhorados)**
- Base de gastos, comissão total, pago, pendente (mantém)
- Adicionar: comissão média mensal, mês com maior comissão

**Seção B -- Acompanhamento Mensal Comparativo**
- Tabela/chart com colunas: Mês, Gastos do Mês, Comissão Gerada, Comissão Paga, Saldo Pendente
- Barra de progresso por mês
- Comparativo com mês anterior (seta verde/vermelha + %)
- Usar Recharts BarChart para visualização mensal

**Seção C -- Detalhamento de Pagamentos**
- Cada pagamento mostra: valor, mês referência, fornecedor/origem, categoria, status (pago/pendente), data do pagamento, se foi automático
- Drawer ao clicar no pagamento com todos os detalhes + link para a transação de origem
- Filtros por mês e status
- Botão para marcar como pago / registrar pagamento

#### 3. Componente ComissaoDetailDrawer
Sheet lateral mostrando:
- Dados completos do pagamento
- Origem (transação vinculada, fornecedor, NF)
- Histórico de alterações
- Botões de ação (marcar pago, editar, excluir)

### Arquivos
- **Migração SQL**: adicionar `transacao_id`, `categoria`, `fornecedor`, `forma_pagamento` à tabela `obra_comissao_pagamentos`
- **`src/pages/ComissaoPage.tsx`**: reescrever completo com as 3 seções
- **`src/components/ComissaoDetailDrawer.tsx`**: novo componente de detalhamento

### Dados para o comparativo mensal
Agrupar transações de saída por mês (`data` field) para calcular gastos mensais, e cruzar com comissões agrupadas por `mes` para mostrar o comparativo lado a lado.

