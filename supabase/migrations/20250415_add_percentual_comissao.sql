-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: adicionar percentual_comissao em obra_config
-- Data: 2025-04-15
--
-- PROBLEMA ANTERIOR:
--   O percentual de comissão do construtor estava hardcoded como constante 8
--   na ComissaoPage.tsx. A ConfiguracoesPage.tsx tinha um campo `comissaoRate`
--   no estado local mas nunca o persistia nem o lia de volta.
--
-- SOLUÇÃO:
--   Adicionar coluna `percentual_comissao` na tabela obra_config com padrão 8.
--   O hook useObraConfig e o serviço obraConfig.ts passam a ler esse valor.
--
-- EXECUÇÃO:
--   Rodar no Supabase SQL Editor ou via `supabase db push`
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE obra_config
  ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 8;

COMMENT ON COLUMN obra_config.percentual_comissao IS
  'Percentual de comissão do construtor sobre o total de saídas (ex: 8 = 8%). Padrão: 8.';

-- Garante que o valor não seja negativo nem absurdo
ALTER TABLE obra_config
  ADD CONSTRAINT IF NOT EXISTS chk_percentual_comissao
    CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100);
