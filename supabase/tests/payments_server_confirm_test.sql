-- Server-side confirmation path: simulate the verification edge function
-- (service role / no end-user JWT) moving a payment from pending -> completed.
--
-- Run with:
--   psql -f supabase/tests/payments_server_confirm_test.sql
--
-- The customer-write trigger (enforce_customer_payment_update) only fires when
-- auth.uid() = OLD.customer_id. The verification function runs with the
-- service role and no end-user JWT, so auth.uid() is NULL and the trigger is
-- bypassed -- exactly what we assert here. All work is rolled back.

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
    RAISE EXCEPTION 'No job with accepted_worker_id found; cannot run server-confirm test';
  END IF;

  -- -------------------------------------------------------------------------
  -- Step A: simulate the client creating a pending payment.
  -- -------------------------------------------------------------------------
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  INSERT INTO public.payments
    (job_id, customer_id, worker_id, amount, commission, payment_method, status, upi_transaction_id)
  VALUES (v_job, v_customer, v_worker, 100, 10, 'upi', 'pending', 'TEST-TXN-1')
  RETURNING id, status::text INTO v_id, v_status;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'SETUP FAILED: expected pending, got %', v_status;
  END IF;
  RAISE NOTICE 'SETUP OK: client-created payment % is pending', v_id;

  -- -------------------------------------------------------------------------
  -- Step B: simulate the server-side verification path (no end-user JWT,
  -- i.e. auth.uid() = NULL, like the service role inside an edge function).
  -- -------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '', true);

  -- TEST 1: server-side UPDATE pending -> completed MUST succeed.
  UPDATE public.payments
     SET status = 'completed'
   WHERE id = v_id
   RETURNING status::text INTO v_status;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'TEST 1 FAILED: server update did not land (got %)', v_status;
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: server-side confirmation flipped payment to completed';

  -- -------------------------------------------------------------------------
  -- TEST 2: after completion, even the server cannot regress the row
  -- through the customer-write trigger -- but more importantly, if the
  -- customer tries to mutate the completed row, it MUST be rejected by
  -- the "leave-pending" guard.
  -- -------------------------------------------------------------------------
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.payments
       SET upi_transaction_id = 'CUSTOMER-TAMPER'
     WHERE id = v_id;
    RAISE EXCEPTION 'TEST 2 FAILED: customer mutated a completed payment';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 2 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 2 PASSED: completed payment is locked from customer writes (%)', v_err;
  END;

  -- -------------------------------------------------------------------------
  -- TEST 3: a fresh server-side INSERT may directly create a completed
  -- payment (the insert-pending guard only applies when auth.uid() matches
  -- the customer). This mirrors the verification function recording a
  -- prepaid/offline settlement.
  -- -------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '', true);

  INSERT INTO public.payments
    (job_id, customer_id, worker_id, amount, commission, payment_method, status, upi_transaction_id)
  VALUES (v_job, v_customer, v_worker, 50, 5, 'upi', 'completed', 'TEST-TXN-SERVER')
  RETURNING status::text INTO v_status;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'TEST 3 FAILED: server insert did not persist completed (got %)', v_status;
  END IF;
  RAISE NOTICE 'TEST 3 PASSED: server-side insert may create a completed payment directly';
END $$;

ROLLBACK;
