-- Server-side tests: payments inserted by the client must be 'pending',
-- and clients cannot mark payments 'completed' after insert.
--
-- Run with:
--   psql -v ON_ERROR_STOP=0 -f supabase/tests/payments_status_pending_test.sql
--
-- Each test wraps work in a SAVEPOINT and asserts the trigger raises.
-- Uses an existing job (customer + accepted_worker) for realism.

\set JOB_ID    '9004d15f-6ea6-4a5f-b1e1-70135ed4d058'
\set CUSTOMER  '4b023cfc-43df-4e11-8fe4-443a0439e3e1'

BEGIN;

-- Simulate an authenticated customer's JWT claims (auth.uid() reads this GUC)
SET LOCAL "request.jwt.claims" = '{"sub":"4b023cfc-43df-4e11-8fe4-443a0439e3e1","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- TEST 1: INSERT with status='completed' as the customer MUST be rejected.
-- ---------------------------------------------------------------------------
SAVEPOINT t1;
DO $$
DECLARE
  v_job uuid := '9004d15f-6ea6-4a5f-b1e1-70135ed4d058';
  v_cust uuid := '4b023cfc-43df-4e11-8fe4-443a0439e3e1';
  v_worker uuid;
  v_err text;
BEGIN
  SELECT accepted_worker_id INTO v_worker FROM public.jobs WHERE id = v_job;
  BEGIN
    INSERT INTO public.payments
      (job_id, customer_id, worker_id, amount, commission, payment_method, status)
    VALUES (v_job, v_cust, v_worker, 100, 10, 'upi', 'completed');
    RAISE EXCEPTION 'TEST 1 FAILED: insert with status=completed was allowed';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE '%TEST 1 FAILED%' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'TEST 1 PASSED: insert rejected (%)', v_err;
  END;
END $$;
ROLLBACK TO SAVEPOINT t1;

-- ---------------------------------------------------------------------------
-- TEST 2: INSERT with status='pending' as the customer MUST succeed.
-- ---------------------------------------------------------------------------
SAVEPOINT t2;
DO $$
DECLARE
  v_job uuid := '9004d15f-6ea6-4a5f-b1e1-70135ed4d058';
  v_cust uuid := '4b023cfc-43df-4e11-8fe4-443a0439e3e1';
  v_worker uuid;
  v_id uuid;
  v_status text;
BEGIN
  SELECT accepted_worker_id INTO v_worker FROM public.jobs WHERE id = v_job;
  INSERT INTO public.payments
    (job_id, customer_id, worker_id, amount, commission, payment_method, status)
  VALUES (v_job, v_cust, v_worker, 100, 10, 'upi', 'pending')
  RETURNING id, status::text INTO v_id, v_status;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: expected status=pending, got %', v_status;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: insert with status=pending succeeded (id=%)', v_id;

  -- -----------------------------------------------------------------------
  -- TEST 3: UPDATE status -> completed as the customer MUST be rejected.
  -- -----------------------------------------------------------------------
  BEGIN
    UPDATE public.payments SET status = 'completed' WHERE id = v_id;
    RAISE EXCEPTION 'TEST 3 FAILED: client update to completed was allowed';
  EXCEPTION WHEN others THEN
    DECLARE v_err text;
    BEGIN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      IF v_err LIKE '%TEST 3 FAILED%' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'TEST 3 PASSED: client update rejected (%)', v_err;
    END;
  END;
END $$;
ROLLBACK TO SAVEPOINT t2;

ROLLBACK;
