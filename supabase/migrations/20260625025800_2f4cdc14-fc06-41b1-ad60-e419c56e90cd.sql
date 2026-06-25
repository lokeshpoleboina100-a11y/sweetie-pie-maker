
-- 1) profiles.phone exposure: restrict phone column to owners only
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, role, full_name, avatar_url, bio, skills, experience_years, service_radius_km, latitude, longitude, location_name, rating, total_reviews, total_jobs_completed, is_verified, created_at, updated_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Owner-only access to phone via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.get_own_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_own_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_phone() TO authenticated;

-- 2) payments: enforce status='pending' invariant at the policy level (WITH CHECK)
DROP POLICY IF EXISTS "Customers can update own payments" ON public.payments;
CREATE POLICY "Customers can update own pending payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id AND status = 'pending')
WITH CHECK (auth.uid() = customer_id AND status = 'pending');

-- 3) milestones: restrict worker UPDATE to in_progress/submitted states at policy level
DROP POLICY IF EXISTS "Worker can submit milestone" ON public.milestones;
CREATE POLICY "Worker can submit milestone"
ON public.milestones
FOR UPDATE
TO authenticated
USING (auth.uid() = worker_id)
WITH CHECK (
  auth.uid() = worker_id
  AND status IN ('in_progress'::milestone_status, 'submitted'::milestone_status)
);

-- 4) verification-docs storage: add DELETE and UPDATE policies (owner + admin)
CREATE POLICY "Users can delete own verification docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users can update own verification docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'verification-docs'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Admins can manage verification docs"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 5) Revoke EXECUTE on has_role from anon (only authenticated RLS needs it)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
