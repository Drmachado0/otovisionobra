-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: soft delete para obra_cronograma
-- Data: 2025-04-15
--
-- PROBLEMA:
--   A tabela obra_cronograma não tem coluna deleted_at.
--   O serviço etapas.ts usa DELETE físico como fallback, mas isso quebra
--   a rastreabilidade e o histórico de auditoria.
--
-- SOLUÇÃO:
--   Adicionar deleted_at e atualizar o índice de performance.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE obra_cronograma
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN obra_cronograma.deleted_at IS
  'Soft delete: preenchido na exclusão lógica. NULL = ativo.';

-- Índice para queries que filtram por .is("deleted_at", null)
CREATE INDEX IF NOT EXISTS idx_obra_cronograma_deleted_at
  ON obra_cronograma (deleted_at)
  WHERE deleted_at IS NULL;

-- RLS: garantir isolamento (se ainda não existir)
ALTER TABLE obra_cronograma ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "cronograma_user_isolation"
  ON obra_cronograma
  USING (auth.uid() = user_id);
