
ALTER TABLE public.obra_comissao_pagamentos
  ADD COLUMN IF NOT EXISTS transacao_id uuid REFERENCES public.obra_transacoes_fluxo(id),
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fornecedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS forma_pagamento text NOT NULL DEFAULT '';
