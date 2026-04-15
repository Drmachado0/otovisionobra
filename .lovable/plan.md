

## Plan: Mostrar origem detalhada das comissões

### Problema
Os registros de comissão têm a origem no campo `observacoes` (ex: "NF 167970 - CONSTRUNORTE", "Orçamento - SINOBRAS (Estrutura)") mas a lista mostra apenas mês e valor, sem destaque para essa informação. Os campos `fornecedor`, `categoria` e `forma_pagamento` estão vazios nos dados existentes. O drawer também não busca a transação vinculada.

### Mudanças

#### 1. ComissaoPage.tsx -- Lista com origem visível
- Exibir `observacoes` como título principal de cada item (já contém a referência de origem)
- Parsear o prefixo da observação para exibir um badge de tipo de origem: "NF", "Orçamento", "Compra"
- Mostrar o valor base da transação que gerou a comissão (8% inverso: `valor / 0.08`)

#### 2. ComissaoDetailDrawer.tsx -- Seção "Origem" com dados da transação
- Adicionar seção "Origem da Comissão" no drawer
- Parsear `observacoes` para extrair: tipo (NF/Orçamento/Compra), referência, fornecedor
- Se `transacao_id` existir, buscar a transação vinculada e mostrar: descrição, categoria, valor original, data, forma de pagamento, origem_tipo
- Mostrar cálculo: "8% de R$ X.XXX = R$ YYY"
- Badge visual do tipo de origem (NF, Compra, Orçamento)

#### 3. Backfill: extrair fornecedor/categoria do observacoes
- No frontend, parsear o campo `observacoes` para preencher visualmente fornecedor e categoria quando os campos dedicados estiverem vazios
- Exemplo: "Orçamento - SINOBRAS (Estrutura)" → fornecedor: "SINOBRAS", categoria: "Estrutura"
- Exemplo: "NF 167970 - CONSTRUNORTE MATERIAIS" → referência: "NF 167970", fornecedor: "CONSTRUNORTE MATERIAIS"

### Arquivos a editar
- `src/pages/ComissaoPage.tsx` -- badges de origem na lista, valor base calculado
- `src/components/ComissaoDetailDrawer.tsx` -- seção origem, fetch transação vinculada, cálculo visual

### Sem migração necessária
Os dados já estão no campo `observacoes`. A melhoria é puramente de apresentação no frontend.

