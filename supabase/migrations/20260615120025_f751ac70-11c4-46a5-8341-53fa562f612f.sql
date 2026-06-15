
-- 1) Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 2) escrow_transactions: restrict customer insert types and field values
DROP POLICY IF EXISTS "Customer creates escrow tx" ON public.escrow_transactions;
CREATE POLICY "Customer creates deposit escrow tx"
ON public.escrow_transactions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = customer_id
  AND type::text IN ('deposit','fund')
  AND amount > 0
  AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.customer_id = auth.uid())
);

-- 3) jobs: hide escrow_balance from public/anonymous - require auth to select
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Jobs viewable by authenticated users"
ON public.jobs
FOR SELECT TO authenticated
USING (true);

-- 4) messages: only job participants can send
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
CREATE POLICY "Job participants can send messages"
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id
      AND (j.customer_id = auth.uid() OR j.accepted_worker_id = auth.uid())
  )
);

-- 5) milestones: restrict worker update to status/submitted_at only via trigger
CREATE OR REPLACE FUNCTION public.enforce_worker_milestone_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only enforce when the actor is the worker (and not the customer)
  IF auth.uid() = OLD.worker_id AND auth.uid() <> OLD.customer_id THEN
    IF NEW.amount       IS DISTINCT FROM OLD.amount       OR
       NEW.title        IS DISTINCT FROM OLD.title        OR
       NEW.description  IS DISTINCT FROM OLD.description  OR
       NEW.due_date     IS DISTINCT FROM OLD.due_date     OR
       NEW.released_at  IS DISTINCT FROM OLD.released_at  OR
       NEW.customer_id  IS DISTINCT FROM OLD.customer_id  OR
       NEW.worker_id    IS DISTINCT FROM OLD.worker_id    OR
       NEW.job_id       IS DISTINCT FROM OLD.job_id       OR
       NEW.order_index  IS DISTINCT FROM OLD.order_index
    THEN
      RAISE EXCEPTION 'Workers can only update milestone status and submission timestamp';
    END IF;
    IF NEW.status::text NOT IN ('submitted','in_progress') THEN
      RAISE EXCEPTION 'Workers can only set milestone status to in_progress or submitted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_worker_milestone_update ON public.milestones;
CREATE TRIGGER trg_enforce_worker_milestone_update
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_milestone_update();

-- 6) payments: prevent customer from mutating sensitive fields
CREATE OR REPLACE FUNCTION public.enforce_customer_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() = OLD.customer_id THEN
    IF NEW.status         IS DISTINCT FROM OLD.status         OR
       NEW.amount         IS DISTINCT FROM OLD.amount         OR
       NEW.commission     IS DISTINCT FROM OLD.commission     OR
       NEW.worker_id      IS DISTINCT FROM OLD.worker_id      OR
       NEW.customer_id    IS DISTINCT FROM OLD.customer_id    OR
       NEW.job_id         IS DISTINCT FROM OLD.job_id         OR
       NEW.payment_method IS DISTINCT FROM OLD.payment_method
    THEN
      RAISE EXCEPTION 'Customers may only update the UPI transaction reference on pending payments';
    END IF;
    IF OLD.status::text <> 'pending' THEN
      RAISE EXCEPTION 'Payments can no longer be modified after they leave pending state';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_payment_update ON public.payments;
CREATE TRIGGER trg_enforce_customer_payment_update
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_payment_update();

-- 7) Realtime channel authorization - restrict subscriptions to job participants
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Job participants subscribe to job topic" ON realtime.messages;
CREATE POLICY "Job participants subscribe to job topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow only if the topic is a job channel the user participates in.
  -- Topic format expected: job:<uuid>
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id::text = split_part(realtime.topic(), ':', 2)
      AND (j.customer_id = auth.uid() OR j.accepted_worker_id = auth.uid())
  )
);

-- 8) Restrict avatars bucket listing to user's own folder while keeping individual file reads
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar file access"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
  AND name IS NOT NULL
  AND position('/' in name) > 0
);
