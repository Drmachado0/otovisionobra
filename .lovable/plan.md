

## Plan: Sistema de Compras Parceladas e Recorrentes

### Problema atual
O formulário de compras é simplista: apenas campos básicos, sem suporte a parcelamento (apesar do banco já ter `parcelas` jsonb e `numero_parcelas`), sem compras recorrentes (assinaturas), e sem visualização de parcelas pagas/pendentes.

### O que o banco já suporta
- `obra_compras`: campos `parcelas` (jsonb), `numero_parcelas` (int), `observacoes`, `data_entrega_prevista`, `nf_vinculada`, `conta_id`, `itens` (jsonb)
- Função `pagar_parcela_atomica`: já existe para pagar parcela individual e gerar transação
- Função `create_compra_atomica`: já cria compra + transação + comissão atomicamente

### Mudanças

#### 1. ComprasPage.tsx -- Reescrever formulário e listagem

**Formulário "Nova Compra" expandido:**
- Tipo de compra: "Única", "Parcelada", "Recorrente"
- Se **Parcelada**: campos `numero_parcelas` (2-48x), gera array de parcelas com datas mensais, valor por parcela calculado automaticamente, cada parcela com status Pendente/Paga
- Se **Recorrente**: campos `periodicidade` (Mensal/Trimestral/Anual), `descricao` da assinatura (ex: "Internet", "Câmeras"), marca `recorrencia` na transação
- Campo `observacoes`
- Usar `create_compra_atomica` RPC ao invés de insert direto (já gera transação e comissão atomicamente)

**Listagem melhorada:**
- Coluna "Tipo" com badge: Única / Parcelada (3/6x) / Recorrente
- Coluna "Parcelas" mostrando progresso: "2/6 pagas"
- Expandir linha ao clicar para ver detalhamento das parcelas com datas e status
- Botão "Pagar Parcela" que chama `pagar_parcela_atomica`
- KPI adicional: "Parcelas Pendentes" (valor total das parcelas ainda não pagas)

**Filtros:**
- Por tipo (Única/Parcelada/Recorrente)
- Por status de pagamento

#### 2. Componente CompraDetailDrawer (dentro de ComprasPage ou novo arquivo)
- Sheet lateral ao clicar na compra
- Mostra todos os campos: fornecedor, valor total, categoria, observações, NF vinculada
- Se parcelada: tabela de parcelas com número, valor, data vencimento, status, botão "Pagar"
- Se recorrente: próximo vencimento, histórico de cobranças
- Botão editar / soft-delete

#### 3. Lógica de parcelas
- Ao criar compra parcelada, gerar array `parcelas` com objetos: `{ numero: 1, valor: X, data_vencimento: "YYYY-MM-DD", status: "Pendente" }`
- Ao pagar parcela, chamar `pagar_parcela_atomica` que atualiza status e cria transação no fluxo
- Não gerar transação de valor total na criação -- só gerar transação por parcela paga

#### 4. Lógica de recorrentes
- Salvar com `forma_pagamento` indicando recorrência e `observacoes` com detalhes
- Transação gerada com `recorrencia: "Mensal"` (ou Trimestral/Anual)
- Na listagem, mostrar badge "Recorrente" com ícone de refresh

### Arquivos a editar
- `src/pages/ComprasPage.tsx` -- reescrever completo com formulário expandido, parcelas, recorrentes, drawer de detalhes
- Nenhuma migração necessária -- banco já tem todos os campos

### Detalhes técnicos
- Usar RPC `create_compra_atomica` para criação (compra única/recorrente gera transação; parcelada não gera transação imediata)
- Usar RPC `pagar_parcela_atomica` para pagamento individual de parcela
- Array de parcelas: `[{numero: 1, valor: 500, data_vencimento: "2026-05-15", status: "Pendente"}, ...]`
- Fetch expandido: incluir `parcelas, numero_parcelas, observacoes, nf_vinculada, conta_id, itens` na query

