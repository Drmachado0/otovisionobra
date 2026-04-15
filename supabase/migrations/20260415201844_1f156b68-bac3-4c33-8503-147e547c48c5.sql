
-- Table: documentos processados
CREATE TABLE public.obra_documentos_processados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL DEFAULT '',
  origem_arquivo TEXT NOT NULL DEFAULT 'upload',
  caminho_origem TEXT NOT NULL DEFAULT '',
  hash_arquivo TEXT NOT NULL DEFAULT '',
  status_processamento TEXT NOT NULL DEFAULT 'pendente',
  tipo_documento TEXT NOT NULL DEFAULT '',
  confianca_extracao NUMERIC NOT NULL DEFAULT 0,
  payload_bruto JSONB DEFAULT '{}'::jsonb,
  payload_normalizado JSONB DEFAULT '{}'::jsonb,
  motivo_erro TEXT NOT NULL DEFAULT '',
  motivo_revisao TEXT NOT NULL DEFAULT '',
  duplicidade_status TEXT NOT NULL DEFAULT 'unico',
  duplicidade_score NUMERIC NOT NULL DEFAULT 0,
  documento_relacionado_id UUID REFERENCES public.obra_documentos_processados(id),
  storage_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_documentos_processados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own docs" ON public.obra_documentos_processados
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_docs_proc_user ON public.obra_documentos_processados(user_id);
CREATE INDEX idx_docs_proc_hash ON public.obra_documentos_processados(hash_arquivo);
CREATE INDEX idx_docs_proc_status ON public.obra_documentos_processados(status_processamento);

CREATE TRIGGER set_docs_proc_updated_at BEFORE UPDATE ON public.obra_documentos_processados
  FOR EACH ROW EXECUTE FUNCTION public.obra_handle_updated_at();

-- Table: movimentações extraídas
CREATE TABLE public.obra_movimentacoes_extraidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  documento_id UUID NOT NULL REFERENCES public.obra_documentos_processados(id) ON DELETE CASCADE,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  tipo_movimentacao TEXT NOT NULL DEFAULT 'saida',
  saldo NUMERIC,
  categoria_sugerida TEXT NOT NULL DEFAULT 'Outro',
  score_confianca NUMERIC NOT NULL DEFAULT 0,
  score_duplicidade NUMERIC NOT NULL DEFAULT 0,
  status_revisao TEXT NOT NULL DEFAULT 'pendente',
  transacao_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_movimentacoes_extraidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own movs" ON public.obra_movimentacoes_extraidas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_movs_doc ON public.obra_movimentacoes_extraidas(documento_id);

-- Table: eventos de processamento (imutável)
CREATE TABLE public.obra_eventos_processamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  documento_id UUID NOT NULL REFERENCES public.obra_documentos_processados(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  mensagem TEXT NOT NULL DEFAULT '',
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_eventos_processamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own events" ON public.obra_eventos_processamento
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own events" ON public.obra_eventos_processamento
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_eventos_doc ON public.obra_eventos_processamento(documento_id);

-- Audit triggers
CREATE TRIGGER audit_docs_processados AFTER INSERT OR UPDATE OR DELETE ON public.obra_documentos_processados
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_movs_extraidas AFTER INSERT OR UPDATE OR DELETE ON public.obra_movimentacoes_extraidas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
