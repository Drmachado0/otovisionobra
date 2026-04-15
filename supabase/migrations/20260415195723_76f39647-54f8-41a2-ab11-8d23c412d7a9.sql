
-- Enum para roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'construtor', 'visualizador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela de roles (separada do perfil por segurança)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'visualizador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para checar role (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para buscar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS: usuário vê apenas seu próprio role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Apenas admin pode gerenciar roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tabela de audit log (imutável)
CREATE TABLE IF NOT EXISTS public.obra_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL DEFAULT '',
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL DEFAULT '',
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas leitura para admins, insert para authenticated
CREATE POLICY "Authenticated can insert audit logs"
  ON public.obra_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.obra_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS public.obra_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  titulo TEXT NOT NULL DEFAULT '',
  mensagem TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nao_lida',
  prioridade TEXT NOT NULL DEFAULT 'media',
  link TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.obra_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON public.obra_notificacoes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Soft delete: adicionar deleted_at nas tabelas principais
ALTER TABLE public.obra_transacoes_fluxo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.obra_compras ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.obra_notas_fiscais ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.obra_fornecedores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.obra_orcamentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.obra_comissao_pagamentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.obra_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.obra_audit_log(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.obra_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user ON public.obra_notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON public.obra_notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- Trigger function para audit log automático
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.obra_audit_log (user_id, user_email, acao, tabela, registro_id, dados_novos)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), COALESCE(current_setting('request.jwt.claims', true)::json->>'email', ''), 'criação', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.obra_audit_log (user_id, user_email, acao, tabela, registro_id, dados_anteriores, dados_novos)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), COALESCE(current_setting('request.jwt.claims', true)::json->>'email', ''), 'edição', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.obra_audit_log (user_id, user_email, acao, tabela, registro_id, dados_anteriores)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), COALESCE(current_setting('request.jwt.claims', true)::json->>'email', ''), 'exclusão', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

-- Aplicar trigger nas tabelas principais
CREATE TRIGGER audit_obra_transacoes AFTER INSERT OR UPDATE OR DELETE ON public.obra_transacoes_fluxo FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_obra_compras AFTER INSERT OR UPDATE OR DELETE ON public.obra_compras FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_obra_notas_fiscais AFTER INSERT OR UPDATE OR DELETE ON public.obra_notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_obra_fornecedores AFTER INSERT OR UPDATE OR DELETE ON public.obra_fornecedores FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER audit_obra_comissao AFTER INSERT OR UPDATE OR DELETE ON public.obra_comissao_pagamentos FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
