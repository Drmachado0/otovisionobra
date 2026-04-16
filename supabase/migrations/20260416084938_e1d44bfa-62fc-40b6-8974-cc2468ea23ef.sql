
ALTER TABLE public.obra_transacoes_fluxo
  ADD COLUMN IF NOT EXISTS recorrencia_frequencia text,
  ADD COLUMN IF NOT EXISTS recorrencia_max_ocorrencias integer,
  ADD COLUMN IF NOT EXISTS recorrencia_ocorrencias_criadas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recorrencia_ativa boolean NOT NULL DEFAULT true;
