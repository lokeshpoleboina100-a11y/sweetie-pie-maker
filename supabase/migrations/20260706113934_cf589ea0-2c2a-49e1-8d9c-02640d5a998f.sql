
-- ============================================================
-- 1. payments: force status='pending' on client insert
-- ============================================================
DROP POLICY IF EXISTS "Customers can create payments" ON public.payments;
CREATE POLICY "Customers can create payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = customer_id
  AND status = 'pending'::payment_status
);

-- Lock sensitive payment columns from client updates. Customers may only
-- edit upi_transaction_id on pending payments via existing policy/trigger.
REVOKE UPDATE ON public.payments FROM authenticated;
GRANT UPDATE (upi_transaction_id) ON public.payments TO authenticated;

-- ============================================================
-- 2. jobs: lock server-only columns from client updates
-- ============================================================
-- Customers may update descriptive columns of their jobs but never
-- escrow_balance / bid_count / accepted_worker_id / customer_id.
REVOKE UPDATE ON public.jobs FROM authenticated;
GRANT UPDATE (
  title, description, category, budget_min, budget_max, is_negotiable,
  is_instant, latitude, longitude, location_name, images, status, updated_at
) ON public.jobs TO authenticated;

-- ============================================================
-- 3. milestones: workers may only edit status + submitted_at
-- ============================================================
DROP POLICY IF EXISTS "Worker can submit milestone" ON public.milestones;
CREATE POLICY "Worker can submit milestone"
ON public.milestones
FOR UPDATE
TO authenticated
USING (auth.uid() = worker_id)
WITH CHECK (
  auth.uid() = worker_id
  AND status = ANY (ARRAY['in_progress'::milestone_status, 'submitted'::milestone_status])
);

-- Column-level guard: revoke broad update, re-grant only the columns each
-- role legitimately edits. Customer edits are further scoped by policy/trigger.
REVOKE UPDATE ON public.milestones FROM authenticated;
GRANT UPDATE (
  title, description, amount, due_date, order_index, status,
  submitted_at, released_at, updated_at
) ON public.milestones TO authenticated;

-- ============================================================
-- 4. profiles: hide phone from arbitrary authenticated users
-- ============================================================
-- Revoke blanket SELECT and re-grant every column except phone. Clients
-- fetch their own phone via public.get_own_phone() (existing SECURITY DEFINER).
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, user_id, role, full_name, avatar_url, bio, skills, experience_years,
  service_radius_km, latitude, longitude, location_name, rating,
  total_jobs_completed, total_reviews, is_verified, created_at, updated_at
) ON public.profiles TO authenticated;

-- ============================================================
-- 5. verification-docs storage: explicit admin delete + owner update
--    (policies below are additive; existing owner/admin policies remain)
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete verification docs" ON storage.objects;
CREATE POLICY "Admins can delete verification docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can update verification docs" ON storage.objects;
CREATE POLICY "Admins can update verification docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'verification-docs'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
