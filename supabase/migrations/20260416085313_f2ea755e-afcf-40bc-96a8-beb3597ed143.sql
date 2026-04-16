ALTER TABLE public.obra_transacoes_fluxo
ADD COLUMN IF NOT EXISTS recorrencia_mae boolean NOT NULL DEFAULT false;