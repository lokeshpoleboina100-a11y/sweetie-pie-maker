-- Server-side tests: payments inserted by the client must be 'pending',
-- and clients cannot mark payments 'completed' after insert.
--
-- Run with:
--   psql -f supabase/tests/payments_status_pending_test.sql
--
-- All work is rolled back. Requires at least one job with an accepted worker.

BEGIN;

DO $$
DECLARE
  v_job       uuid;
  v_customer  uuid;
  v_worker    uuid;
  v_id        uuid;
  v_status    text;
  v_err       text;
BEGIN
  SELECT id, customer_id, accepted_worker_id
    INTO v_job, v_customer, v_worker
  FROM public.jobs
  WHERE accepted_worker_id IS NOT NULL
  LIMIT 1;

  IF v_job IS NULL THEN
    RAISE EXCEPTION 'No job with accepted_worker_id found; cannot run payment tests';
  END IF;

  -- Simulate the customer's JWT claims (auth.uid() reads this GUC)
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  -- -------------------------------------------------------------------------
  -- TEST 1: client INSERT with status='completed' MUST be rejected.
  -- -------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.payments
      (job_id, customer_id, worker_id, amount, commission, payment_method, status)
    VALUES (v_job, v_customer, v_worker, 100, 10, 'upi', 'completed');
    RAISE EXCEPTION 'TEST 1 FAILED: insert with status=completed was allowed';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 1 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 1 PASSED: insert blocked (%)', v_err;
  END;

  -- -------------------------------------------------------------------------
  -- TEST 2: client INSERT with status='pending' MUST succeed.
  -- -------------------------------------------------------------------------
  INSERT INTO public.payments
    (job_id, customer_id, worker_id, amount, commission, payment_method, status)
  VALUES (v_job, v_customer, v_worker, 100, 10, 'upi', 'pending')
  RETURNING id, status::text INTO v_id, v_status;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: expected pending, got %', v_status;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: insert with status=pending succeeded';

  -- -------------------------------------------------------------------------
  -- TEST 3: client UPDATE flipping status to 'completed' MUST be rejected.
  -- -------------------------------------------------------------------------
  BEGIN
    UPDATE public.payments SET status = 'completed' WHERE id = v_id;
    RAISE EXCEPTION 'TEST 3 FAILED: client update to completed was allowed';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 3 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 3 PASSED: client update blocked (%)', v_err;
  END;
END $$;

ROLLBACK;
