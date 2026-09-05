ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'home_services';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'automotive';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'technology';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'education';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'beauty_wellness';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'moving_delivery';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'gardening_outdoor';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'pet_services';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'events_creative';
ALTER TYPE public.job_category ADD VALUE IF NOT EXISTS 'professional_services';

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS service text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS main_category text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS services text[] DEFAULT '{}';

GRANT SELECT (service), UPDATE (service), INSERT (service) ON public.jobs TO authenticated;
GRANT DELETE ON public.jobs TO authenticated;
GRANT SELECT (main_category, services), UPDATE (main_category, services), INSERT (main_category, services) ON public.profiles TO authenticated;
GRANT SELECT (main_category, services) ON public.profiles TO anon;