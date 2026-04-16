

## Plan: Sistema de Notificações Automáticas OTOVISION

### O que já existe
- Tabela `obra_notificacoes` com campos: id, user_id, tipo, titulo, mensagem, status, prioridade, link, read_at, created_at
- `NotificationBell` component funcional com dropdown, badge, marcar como lida
- `useNotifications` hook com realtime subscription

### O que será implementado

#### 1. Migration: Tabela `obra_notification_preferences`
```sql
CREATE TABLE obra_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tipo)
);
-- RLS: user sees/edits only their own
```

#### 2. Hook `useNotificationGenerator` (novo)
Executado uma vez no `App.tsx` (ou `AppLayout`), verifica condições e insere notificações na `obra_notificacoes` se ainda não existir uma recente (< 24h) do mesmo tipo+referência:

- **Etapas atrasadas**: `obra_cronograma` onde `fim_previsto < now()` AND `percentual_conclusao < 100` AND `status != 'Concluída'`
- **Comissões pendentes**: `obra_comissao_pagamentos` onde `pago = false` AND `deleted_at IS NULL`
- **Parcelas vencendo**: `obra_compras` com `forma_pagamento = 'Parcelada'`, iterar `parcelas` JSON para encontrar parcelas com vencimento nos próximos 3 dias e status != 'Paga'
- **NFs pendentes**: `obra_notas_fiscais` onde `status != 'Ativa'` AND `status != 'Paga'` AND `created_at < now() - 7 days` AND `deleted_at IS NULL`
- **Orçamento > 80%**: comparar soma de `obra_transacoes_fluxo` (tipo Saída) com `obra_config.orcamento_total`

Antes de gerar, consulta `obra_notification_preferences` para respeitar toggles.

#### 3. Seção "Notificações" em `ConfiguracoesPage.tsx`
Nova seção com Switch toggles para cada tipo:
- Etapas atrasadas
- Comissões pendentes
- Parcelas vencendo
- Notas fiscais pendentes
- Alerta de orçamento

#### 4. Atualizar `NotificationBell` 
- Atualizar `ICON_MAP` para incluir novos tipos: `etapa_atrasada`, `comissao_pendente`, `parcela_vencendo`, `nf_pendente`, `orcamento_alerta`
- Aumentar limit de slice para 50

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration | Criar `obra_notification_preferences` + RLS |
| `src/hooks/useNotificationGenerator.ts` | Novo — lógica de geração automática |
| `src/components/AppLayout.tsx` | Chamar `useNotificationGenerator` |
| `src/pages/ConfiguracoesPage.tsx` | Adicionar seção de preferências com toggles |
| `src/components/NotificationBell.tsx` | Atualizar ícones e limit |

### Detalhes técnicos
- Deduplicação: antes de inserir, verificar se já existe notificação do mesmo `tipo` com `created_at > now() - 24h` para o mesmo item (usando link ou mensagem como identificador)
- O generator roda no `useEffect` do mount apenas, sem polling (realtime já cuida do refresh)
- Preferências carregadas via query simples no hook generator

