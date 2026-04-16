-- Create storage bucket for transaction attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-attachments', 'transaction-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload transaction attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'transaction-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own transaction attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'transaction-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own transaction attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'transaction-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create attachments table
CREATE TABLE public.obra_transacao_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT '',
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_transacao_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transaction attachments"
ON public.obra_transacao_anexos FOR ALL TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE INDEX idx_obra_transacao_anexos_transaction ON public.obra_transacao_anexos(transaction_id);