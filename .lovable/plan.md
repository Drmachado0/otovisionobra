

## Plan: Correção de Bugs do Relatório de Testes OTOVISION v1.0

Analisei o relatório completo de testes e o código-fonte. Vou organizar as correções por prioridade.

### Fase 1 — Bugs Críticos

#### 1.1 Status automático de etapa (Cronograma/Insights)
**Problema**: Etapa com 100% de progresso permanece "Em Andamento".
**Correção em `CronogramaPage.tsx`**:
- No `handleSave`, auto-definir `status` baseado no `percentual_conclusao`: 100% → "Concluída", >0% e status "Não Iniciada" → "Em Andamento"
- Adicionar validação visual: nome vazio (já existe mas sem visual), progresso fora de 0-100, custo negativo, data fim < data início — exibir mensagens de erro nos campos

#### 1.2 Unificar cálculo de comissão (Dashboard/Insights/Comissão)
**Problema**: Dashboard e Insights usam queries diferentes da página de Comissão, gerando valores divergentes.
**Correção**: Garantir que Dashboard (`comissoesRes`) e Insights usem a mesma query — `select("valor, pago").is("deleted_at", null).eq("pago", false)`. O Insights atualmente filtra `!c.pago` no frontend mas não filtra `deleted_at` no select — corrigir para `.is("deleted_at", null)`.

#### 1.3 Adicionar exclusão de etapas no Cronograma
- Botão "Excluir" no modal de edição com `ConfirmDialog`
- Soft delete via `deleted_at` ou hard delete (a tabela não tem `deleted_at`, verificar schema)

### Fase 2 — Bugs de Alta Prioridade

#### 2.1 Validação visual nos formulários do Cronograma
- Exibir erros inline em vermelho para: nome vazio, progresso <0 ou >100, custo negativo, data fim < data início
- Usar estado de erros no formulário

#### 2.2 Feedback toast no Leitor IA
**Problema**: `salvarTransacao` já tem `toast.success` (linha 152), mas o relatório diz que não aparece.
**Verificação**: O toast já existe no código. Pode ser um bug de timing. Garantir que o toast só dispare após sucesso confirmado.

#### 2.3 Formato de data técnico na Comissão
- Converter "2026-03" → "Março/2026" no display do campo `mes`

### Fase 3 — Bugs Médios

#### 3.1 Formatação sinal negativo no extrato (ContasBancariasPage)
- Corrigir para que "-" fique junto ao "R$" (ex: "-R$ 2.060,00")

#### 3.2 Textos truncados — adicionar tooltips
- Em `FluxoCaixaPage`, `PrevisaoPage` e tabelas gerais, adicionar `title` attribute nos `<td>` truncados para tooltip nativo

#### 3.3 Auditoria com detalhes legíveis
- Em vez de JSON bruto, mostrar resumo: "Valor: R$ 1.000 → R$ 1.200" ou "Descrição: X" usando campos-chave do `dados_novos`/`dados_anteriores`

#### 3.4 Previsão: "-100.0%" → "Sem execução"
- Quando custo_real é 0, exibir "Sem execução" em vez de variação negativa

#### 3.5 Configurações: Mostrar admin logado na seção Usuários
- Verificar a query de `user_roles` e garantir que o admin aparece

### Arquivos a modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/pages/CronogramaPage.tsx` | Auto-status, validação visual, botão excluir etapa |
| `src/pages/InsightsPage.tsx` | Filtrar `deleted_at` na query de comissões |
| `src/pages/DashboardPage.tsx` | Verificar consistência da query (já OK, confirmar) |
| `src/pages/ComissaoPage.tsx` | Formatar mês "2026-03" → "Março/2026" |
| `src/pages/ContasBancariasPage.tsx` | Fix sinal negativo junto ao valor |
| `src/pages/FluxoCaixaPage.tsx` | Tooltips em textos truncados |
| `src/pages/PrevisaoPage.tsx` | "-100%" → "Sem execução", tooltips em categorias |
| `src/pages/AuditoriaPage.tsx` | Resumo legível das alterações em vez de JSON bruto |
| `src/pages/ConfiguracoesPage.tsx` | Fix seção Usuários para mostrar admin |
| `src/pages/LeitorIAPage.tsx` | Verificar toast (já existe, confirmar funcionamento) |

### Detalhes técnicos
- Auto-status no Cronograma: lógica no `handleSave` antes de enviar ao banco
- Comissão Insights fix: adicionar `.is("deleted_at", null)` na query de `obra_comissao_pagamentos`
- Formatar mês: função helper `formatMes("2026-03")` → mapa de meses em PT-BR
- Auditoria legível: extrair campos-chave (`descricao`, `valor`, `fornecedor`, `status`) e mostrar diff quando `dados_anteriores` existe
- Pode ser necessária uma migration se `obra_cronograma` não tiver `deleted_at` — verificar antes de implementar exclusão

