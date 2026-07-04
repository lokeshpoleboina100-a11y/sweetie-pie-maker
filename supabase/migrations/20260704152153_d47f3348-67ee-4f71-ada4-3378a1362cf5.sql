
-- Revoke public/anon execute on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.enforce_worker_bid_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_job_update() FROM PUBLIC, anon, authenticated;

-- Restrict user_roles admin policies to non-anonymous authenticated users
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND has_role(auth.uid(), 'admin'::app_role)
);
