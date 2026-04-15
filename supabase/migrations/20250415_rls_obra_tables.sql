-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: RLS (Row Level Security) para tabelas obra_*
-- Data: 2025-04-15
--
-- PROBLEMA IDENTIFICADO:
--   O projeto Supabase compartilha o banco com outro sistema (clínica
--   oftalmológica). As tabelas obra_* não têm RLS verificado — qualquer
--   usuário autenticado pode teoricamente ler dados de outros usuários
--   se o filtro `user_id` no frontend for bypassado.
--
-- SOLUÇÃO:
--   Habilitar RLS e criar políticas que garantam isolamento por user_id.
--
-- ⚠️  ATENÇÃO: Revisar e ajustar antes de executar.
--   Algumas tabelas podem ter comportamento diferente (ex: obra_config pode
--   ser compartilhada entre múltiplos usuários de um mesmo projeto).
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── Habilitar RLS nas tabelas principais ────────────────────────────────────

ALTER TABLE obra_transacoes_fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_documentos_processados ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_movimentacoes_extraidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_comissao_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_cronograma ENABLE ROW LEVEL SECURITY;

-- ─── Políticas: usuário só vê e altera os próprios registros ─────────────────

-- obra_transacoes_fluxo
CREATE POLICY IF NOT EXISTS "transacoes_user_isolation"
  ON obra_transacoes_fluxo
  USING (auth.uid() = user_id);

-- obra_compras
CREATE POLICY IF NOT EXISTS "compras_user_isolation"
  ON obra_compras
  USING (auth.uid() = user_id);

-- obra_config (uma config por usuário)
CREATE POLICY IF NOT EXISTS "config_user_isolation"
  ON obra_config
  USING (auth.uid() = user_id);

-- obra_documentos_processados
CREATE POLICY IF NOT EXISTS "documentos_user_isolation"
  ON obra_documentos_processados
  USING (auth.uid() = user_id);

-- obra_notificacoes
CREATE POLICY IF NOT EXISTS "notificacoes_user_isolation"
  ON obra_notificacoes
  USING (auth.uid() = user_id);

-- obra_comissao_pagamentos
CREATE POLICY IF NOT EXISTS "comissao_user_isolation"
  ON obra_comissao_pagamentos
  USING (auth.uid() = user_id);

-- obra_contas_financeiras
CREATE POLICY IF NOT EXISTS "contas_user_isolation"
  ON obra_contas_financeiras
  USING (auth.uid() = user_id);

-- obra_cronograma
CREATE POLICY IF NOT EXISTS "cronograma_user_isolation"
  ON obra_cronograma
  USING (auth.uid() = user_id);

-- obra_audit_log: apenas leitura para admins, escrita para o próprio usuário
CREATE POLICY IF NOT EXISTS "audit_log_read"
  ON obra_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "audit_log_insert"
  ON obra_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Nota sobre user_roles ────────────────────────────────────────────────────
-- A tabela user_roles precisa de política separada dependendo de como
-- o sistema de autenticação está organizado. Verifique se ela existe e
-- se tem RLS adequado para não expor roles de outros usuários.
