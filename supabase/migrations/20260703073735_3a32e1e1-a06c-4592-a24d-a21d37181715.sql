
-- 1) user_roles: restrict admin policies to authenticated role only
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) bids: trigger enforcing column restrictions for workers on their own pending bids
CREATE OR REPLACE FUNCTION public.enforce_worker_bid_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.worker_id THEN
    IF NEW.amount         IS DISTINCT FROM OLD.amount         OR
       NEW.job_id         IS DISTINCT FROM OLD.job_id         OR
       NEW.worker_id      IS DISTINCT FROM OLD.worker_id      OR
       NEW.status         IS DISTINCT FROM OLD.status
    THEN
      RAISE EXCEPTION 'Workers may only edit message/estimated_time on their pending bids';
    END IF;
    IF OLD.status::text <> 'pending' THEN
      RAISE EXCEPTION 'Bids can no longer be modified after leaving pending state';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_worker_bid_update_trg ON public.bids;
CREATE TRIGGER enforce_worker_bid_update_trg
BEFORE UPDATE ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_bid_update();

-- 3) jobs: trigger preventing customers from mutating protected fields
CREATE OR REPLACE FUNCTION public.enforce_customer_job_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.customer_id AND auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.accepted_worker_id IS DISTINCT FROM OLD.accepted_worker_id OR
       NEW.bid_count          IS DISTINCT FROM OLD.bid_count          OR
       NEW.escrow_balance     IS DISTINCT FROM OLD.escrow_balance     OR
       NEW.customer_id        IS DISTINCT FROM OLD.customer_id
    THEN
      RAISE EXCEPTION 'Customers cannot modify accepted_worker_id, bid_count, escrow_balance, or customer_id directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_customer_job_update_trg ON public.jobs;
CREATE TRIGGER enforce_customer_job_update_trg
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_job_update();

-- 4) chat-attachments: add owner-scoped UPDATE policy
DROP POLICY IF EXISTS "Chat participants can update own attachments" ON storage.objects;
CREATE POLICY "Chat participants can update own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'chat-attachments' AND owner = auth.uid());
