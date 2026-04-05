
-- Verification documents table
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'id_proof',
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Workers can view their own documents
CREATE POLICY "Users can view own documents" ON public.verification_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Workers can upload documents
CREATE POLICY "Users can upload documents" ON public.verification_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents" ON public.verification_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update document status
CREATE POLICY "Admins can update documents" ON public.verification_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload verification docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));
