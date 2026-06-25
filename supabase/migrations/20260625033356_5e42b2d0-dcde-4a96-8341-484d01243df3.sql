
-- 1) Block customers from modifying jobs.escrow_balance directly
CREATE OR REPLACE FUNCTION public.enforce_jobs_escrow_balance_protected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.escrow_balance IS DISTINCT FROM OLD.escrow_balance THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'escrow_balance can only be modified by server-side escrow logic';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_jobs_escrow_balance_protected ON public.jobs;
CREATE TRIGGER enforce_jobs_escrow_balance_protected
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_jobs_escrow_balance_protected();

-- Recompute escrow_balance whenever an escrow_transactions row changes
CREATE OR REPLACE FUNCTION public.sync_job_escrow_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_job uuid;
BEGIN
  v_job := COALESCE(NEW.job_id, OLD.job_id);
  SELECT COALESCE(SUM(
           CASE WHEN type = 'fund' THEN amount
                WHEN type = 'release' THEN -amount
                WHEN type = 'refund' THEN -amount
                ELSE 0 END
         ), 0)
  INTO v_balance
  FROM public.escrow_transactions
  WHERE job_id = v_job;

  UPDATE public.jobs
  SET escrow_balance = GREATEST(0, v_balance)
  WHERE id = v_job;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_job_escrow_balance ON public.escrow_transactions;
CREATE TRIGGER sync_job_escrow_balance
AFTER INSERT OR UPDATE OR DELETE ON public.escrow_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_job_escrow_balance();

-- 2) Force payments INSERT by customers to status = 'pending'
CREATE OR REPLACE FUNCTION public.enforce_payment_insert_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.customer_id THEN
    IF NEW.status::text <> 'pending' THEN
      RAISE EXCEPTION 'New payments must be created with status = pending; completion happens server-side after verification';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_payment_insert_pending ON public.payments;
CREATE TRIGGER enforce_payment_insert_pending
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_insert_pending();

-- 3) Helper for chat-attachments storage policies
CREATE OR REPLACE FUNCTION public.can_access_job_chat(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = _job_id
      AND (j.customer_id = _user_id OR j.accepted_worker_id = _user_id)
  )
$$;
