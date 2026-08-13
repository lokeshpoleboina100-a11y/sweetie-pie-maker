-- 1. Extend verification_documents with fraud-detection fields
ALTER TABLE public.verification_documents
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS fraud_status text NOT NULL DEFAULT 'not_analyzed',
  ADD COLUMN IF NOT EXISTS fraud_score integer,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS document_authenticity_score numeric,
  ADD COLUMN IF NOT EXISTS tampering_score numeric,
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS document_type_match boolean,
  ADD COLUMN IF NOT EXISTS duplicate_score numeric,
  ADD COLUMN IF NOT EXISTS fraud_analysis_result jsonb,
  ADD COLUMN IF NOT EXISTS fraud_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS document_hash text;

CREATE INDEX IF NOT EXISTS verification_documents_hash_idx
  ON public.verification_documents (document_hash);

-- 2. Fraud results are server-side only: workers must not write them
REVOKE UPDATE (
  storage_path, fraud_status, fraud_score, risk_level,
  document_authenticity_score, tampering_score, ocr_confidence,
  document_type_match, duplicate_score, fraud_analysis_result,
  fraud_analyzed_at, document_hash, status, admin_notes
) ON public.verification_documents FROM authenticated, anon;

-- Internal signals and fingerprints are not client-readable
REVOKE SELECT (fraud_analysis_result, document_hash, document_authenticity_score, tampering_score, duplicate_score)
  ON public.verification_documents FROM authenticated, anon;

GRANT ALL ON public.verification_documents TO service_role;

-- 3. Backend-configurable thresholds
CREATE TABLE IF NOT EXISTS public.fraud_detection_settings (
  id boolean PRIMARY KEY DEFAULT true,
  low_max integer NOT NULL DEFAULT 30,
  medium_max integer NOT NULL DEFAULT 70,
  auto_approve_low boolean NOT NULL DEFAULT true,
  auto_fail_high boolean NOT NULL DEFAULT true,
  retention_days integer NOT NULL DEFAULT 180,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fraud_detection_settings_singleton CHECK (id)
);

GRANT SELECT, UPDATE ON public.fraud_detection_settings TO authenticated;
GRANT ALL ON public.fraud_detection_settings TO service_role;
ALTER TABLE public.fraud_detection_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read fraud settings" ON public.fraud_detection_settings;
CREATE POLICY "Admins can read fraud settings"
  ON public.fraud_detection_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update fraud settings" ON public.fraud_detection_settings;
CREATE POLICY "Admins can update fraud settings"
  ON public.fraud_detection_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_fraud_settings_updated ON public.fraud_detection_settings;
CREATE TRIGGER trg_fraud_settings_updated
  BEFORE UPDATE ON public.fraud_detection_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.fraud_detection_settings (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

-- 4. Audit log (admin-readable only, written server-side)
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.verification_documents(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verification_audit_log TO authenticated;
GRANT ALL ON public.verification_audit_log TO service_role;
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read verification audit log" ON public.verification_audit_log;
CREATE POLICY "Admins can read verification audit log"
  ON public.verification_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admin-only accessor for full fraud analysis details
CREATE OR REPLACE FUNCTION public.get_verification_fraud_details(_doc_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'id', d.id,
    'fraud_status', d.fraud_status,
    'fraud_score', d.fraud_score,
    'risk_level', d.risk_level,
    'document_authenticity_score', d.document_authenticity_score,
    'tampering_score', d.tampering_score,
    'ocr_confidence', d.ocr_confidence,
    'document_type_match', d.document_type_match,
    'duplicate_score', d.duplicate_score,
    'fraud_analysis_result', d.fraud_analysis_result,
    'fraud_analyzed_at', d.fraud_analyzed_at
  )
  INTO v
  FROM public.verification_documents d
  WHERE d.id = _doc_id;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_verification_fraud_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_verification_fraud_details(uuid) TO authenticated, service_role;