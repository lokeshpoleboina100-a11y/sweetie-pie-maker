-- 1. Allow job owners to delete (RLS policy already exists, the grant was missing)
GRANT DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

-- 2. Cascade dependent rows
ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_job_id_fkey;
ALTER TABLE public.bids ADD CONSTRAINT bids_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_job_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.saved_jobs DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey;
ALTER TABLE public.saved_jobs ADD CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_job_id_fkey;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_job_id_fkey;
ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_milestone_id_fkey;
ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;

ALTER TABLE public.ai_feedback DROP CONSTRAINT IF EXISTS ai_feedback_job_id_fkey;
ALTER TABLE public.ai_feedback ADD CONSTRAINT ai_feedback_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;

ALTER TABLE public.ai_predictions DROP CONSTRAINT IF EXISTS ai_predictions_job_id_fkey;
ALTER TABLE public.ai_predictions ADD CONSTRAINT ai_predictions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_job_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

-- payments intentionally RESTRICT: money records must survive
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_job_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

-- 3. Block deleting jobs that carry real money
CREATE OR REPLACE FUNCTION public.prevent_paid_job_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.job_id = OLD.id AND p.status IN ('completed','refunded')
  ) THEN
    RAISE EXCEPTION 'This job already has a settled payment and cannot be deleted';
  END IF;
  IF OLD.escrow_balance > 0 THEN
    RAISE EXCEPTION 'This job still holds money in escrow. Refund or release it before deleting';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_paid_job_delete_trg ON public.jobs;
CREATE TRIGGER prevent_paid_job_delete_trg BEFORE DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.prevent_paid_job_delete();

REVOKE EXECUTE ON FUNCTION public.prevent_paid_job_delete() FROM PUBLIC;

-- 4. Gateway fields on payments
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'razorpay';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

GRANT SELECT (razorpay_order_id, razorpay_payment_id, razorpay_refund_id, refunded_amount, released_at, refunded_at) ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS payments_razorpay_order_id_key ON public.payments(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;