GRANT SELECT (
  id,
  user_id,
  full_name,
  role,
  avatar_url,
  bio,
  location_name,
  latitude,
  longitude,
  skills,
  experience_years,
  service_radius_km,
  is_verified,
  rating,
  total_reviews,
  total_jobs_completed,
  created_at,
  updated_at
) ON public.profiles TO authenticated;

GRANT INSERT (
  user_id,
  full_name,
  role,
  avatar_url,
  bio,
  phone,
  location_name,
  latitude,
  longitude,
  skills,
  experience_years,
  service_radius_km
) ON public.profiles TO authenticated;

GRANT UPDATE (
  full_name,
  avatar_url,
  bio,
  phone,
  location_name,
  latitude,
  longitude,
  skills,
  experience_years,
  service_radius_km,
  updated_at
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

GRANT EXECUTE ON FUNCTION public.get_own_phone() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      ''
    ),
    NEW.phone
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;