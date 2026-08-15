ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ai_explanation jsonb;

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  feature text not null default 'job_classification',
  vote text check (vote in ('up','down','wrong_category')),
  ai_category text,
  ai_urgency text,
  corrected_category text,
  corrected_urgency text,
  comment text,
  explanation jsonb,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own ai feedback" ON public.ai_feedback;
CREATE POLICY "Users insert own ai feedback" ON public.ai_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own ai feedback" ON public.ai_feedback;
CREATE POLICY "Users read own ai feedback" ON public.ai_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));