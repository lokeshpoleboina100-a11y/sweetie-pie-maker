ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'filled';