-- Hide profiles.phone from other users via column-level privileges.
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, user_id, role, full_name, avatar_url, bio, skills, experience_years,
  service_radius_km, latitude, longitude, location_name, rating, total_reviews,
  total_jobs_completed, is_verified, created_at, updated_at, main_category, services
) ON public.profiles TO authenticated;

-- Owners can still write their own phone (RLS scopes it to auth.uid()).
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;