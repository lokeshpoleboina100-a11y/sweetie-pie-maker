
-- 1. Bids: add WITH CHECK preventing workers from flipping status or reassigning bid
DROP POLICY IF EXISTS "Workers can update own bids" ON public.bids;
CREATE POLICY "Workers can update own pending bids"
ON public.bids
FOR UPDATE
TO authenticated
USING (auth.uid() = worker_id AND status = 'pending'::bid_status)
WITH CHECK (auth.uid() = worker_id AND status = 'pending'::bid_status);

-- 2. Escrow transactions: only 'fund' allowed on customer insert, compared as enum
DROP POLICY IF EXISTS "Customer creates deposit escrow tx" ON public.escrow_transactions;
CREATE POLICY "Customer creates fund escrow tx"
ON public.escrow_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = customer_id
  AND type = 'fund'::escrow_tx_type
  AND amount > 0
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = escrow_transactions.job_id AND j.customer_id = auth.uid()
  )
);

-- 3. Jobs Realtime: exclude escrow_balance column from broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs
  (id, customer_id, title, description, category, budget_min, budget_max,
   is_negotiable, is_instant, latitude, longitude, location_name, images,
   status, accepted_worker_id, bid_count, created_at, updated_at);

-- 4. Verification documents: require real (non-anonymous) sessions
DROP POLICY IF EXISTS "Users can upload documents" ON public.verification_documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.verification_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.verification_documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.verification_documents;

CREATE POLICY "Users can upload documents"
ON public.verification_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Users can view own documents"
ON public.verification_documents
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Admins can view all documents"
ON public.verification_documents
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Admins can update documents"
ON public.verification_documents
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
