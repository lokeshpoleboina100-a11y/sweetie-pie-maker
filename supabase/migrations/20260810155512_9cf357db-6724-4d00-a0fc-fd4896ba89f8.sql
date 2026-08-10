ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'ac_repair';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'refrigerator_repair';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'washing_machine_repair';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'carpentry';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'appliance_repair';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'other';

CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  model_version text NOT NULL DEFAULT 'v1',
  prediction jsonb NOT NULL,
  confidence numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_predictions_job_model_idx ON public.ai_predictions (job_id, model_name, created_at DESC);

GRANT SELECT ON public.ai_predictions TO authenticated;
GRANT ALL ON public.ai_predictions TO service_role;

ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job participants can view AI predictions"
ON public.ai_predictions
FOR SELECT
TO authenticated
USING (
  job_id IS NOT NULL
  AND public.can_access_job_chat(job_id, auth.uid())
);
