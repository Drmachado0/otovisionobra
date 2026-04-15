
-- Conciliações bancárias
CREATE TABLE public.obra_conciliacoes_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movimentacao_extraida_id UUID NOT NULL REFERENCES public.obra_movimentacoes_extraidas(id),
  transacao_id UUID REFERENCES public.obra_transacoes_fluxo(id),
  status_conciliacao TEXT NOT NULL DEFAULT 'nao_analisado',
  score_compatibilidade NUMERIC NOT NULL DEFAULT 0,
  tipo_conciliacao TEXT NOT NULL DEFAULT '',
  motivo_matching TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  conciliado_por UUID,
  conciliado_em TIMESTAMPTZ,
  desfeito_por UUID,
  desfeito_em TIMESTAMPTZ,
  motivo_desfazer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: uma movimentação só pode ter uma conciliação ativa
CREATE UNIQUE INDEX idx_conciliacao_mov_unica
  ON public.obra_conciliacoes_bancarias (movimentacao_extraida_id)
  WHERE status_conciliacao NOT IN ('desfeita','ignorado_temporariamente');

ALTER TABLE public.obra_conciliacoes_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conciliacoes"
  ON public.obra_conciliacoes_bancarias FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_conciliacoes_updated_at
  BEFORE UPDATE ON public.obra_conciliacoes_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- Sugestões de conciliação
CREATE TABLE public.obra_sugestoes_conciliacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movimentacao_extraida_id UUID NOT NULL REFERENCES public.obra_movimentacoes_extraidas(id),
  transacao_id UUID NOT NULL REFERENCES public.obra_transacoes_fluxo(id),
  score_compatibilidade NUMERIC NOT NULL DEFAULT 0,
  motivo_matching TEXT NOT NULL DEFAULT '',
  status_sugestao TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_sugestoes_conciliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sugestoes"
  ON public.obra_sugestoes_conciliacao FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Eventos de conciliação (auditoria imutável)
CREATE TABLE public.obra_eventos_conciliacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conciliacao_id UUID NOT NULL REFERENCES public.obra_conciliacoes_bancarias(id),
  acao TEXT NOT NULL DEFAULT '',
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_eventos_conciliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own eventos conciliacao"
  ON public.obra_eventos_conciliacao FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own eventos conciliacao"
  ON public.obra_eventos_conciliacao FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
