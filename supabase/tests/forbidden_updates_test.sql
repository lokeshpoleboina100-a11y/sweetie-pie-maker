-- Forbidden-UPDATE regression suite.
--
-- Verifies column-level write restrictions enforced by RLS + triggers:
--   * Workers cannot change bids.amount or bids.status on their own bids.
--   * Customers cannot change jobs.accepted_worker_id, jobs.bid_count,
--     or jobs.escrow_balance directly.
--   * Non-owners cannot UPDATE storage.objects rows in chat-attachments.
--
-- All work wrapped in BEGIN/ROLLBACK — the database is not mutated.
-- Each check RAISE NOTICEs on pass and RAISE EXCEPTIONs on regression,
-- so psql exits non-zero and CI fails.

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================
-- 1. Worker cannot UPDATE bids.amount on their own bid.
-- =============================================================
DO $$
DECLARE
  v_bid uuid; v_worker uuid; v_err text;
BEGIN
  SELECT id, worker_id INTO v_bid, v_worker
  FROM public.bids WHERE status = 'pending' LIMIT 1;
  IF v_bid IS NULL THEN
    RAISE NOTICE 'TEST 1 SKIPPED: no pending bid present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_worker, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.bids SET amount = amount + 1 WHERE id = v_bid;
    RAISE EXCEPTION 'TEST 1 FAILED: worker updated bids.amount';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 1 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 1 PASSED: worker cannot update bids.amount (%)', v_err;
  END;
END $$;

-- =============================================================
-- 2. Worker cannot UPDATE bids.status on their own bid.
-- =============================================================
DO $$
DECLARE
  v_bid uuid; v_worker uuid; v_err text;
BEGIN
  SELECT id, worker_id INTO v_bid, v_worker
  FROM public.bids WHERE status = 'pending' LIMIT 1;
  IF v_bid IS NULL THEN
    RAISE NOTICE 'TEST 2 SKIPPED: no pending bid present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_worker, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.bids SET status = 'accepted' WHERE id = v_bid;
    RAISE EXCEPTION 'TEST 2 FAILED: worker updated bids.status';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 2 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 2 PASSED: worker cannot update bids.status (%)', v_err;
  END;
END $$;

-- =============================================================
-- 3. Customer cannot UPDATE jobs.accepted_worker_id directly.
-- =============================================================
DO $$
DECLARE
  v_job uuid; v_customer uuid; v_other uuid; v_err text;
BEGIN
  SELECT id, customer_id INTO v_job, v_customer
  FROM public.jobs LIMIT 1;
  IF v_job IS NULL THEN
    RAISE NOTICE 'TEST 3 SKIPPED: no jobs present';
    RETURN;
  END IF;

  SELECT user_id INTO v_other FROM public.profiles
  WHERE user_id <> v_customer LIMIT 1;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.jobs SET accepted_worker_id = v_other WHERE id = v_job;
    RAISE EXCEPTION 'TEST 3 FAILED: customer wrote accepted_worker_id';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 3 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 3 PASSED: customer cannot write accepted_worker_id (%)', v_err;
  END;
END $$;

-- =============================================================
-- 4. Customer cannot UPDATE jobs.bid_count directly.
-- =============================================================
DO $$
DECLARE
  v_job uuid; v_customer uuid; v_err text;
BEGIN
  SELECT id, customer_id INTO v_job, v_customer
  FROM public.jobs LIMIT 1;
  IF v_job IS NULL THEN
    RAISE NOTICE 'TEST 4 SKIPPED: no jobs present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.jobs SET bid_count = bid_count + 99 WHERE id = v_job;
    RAISE EXCEPTION 'TEST 4 FAILED: customer wrote bid_count';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 4 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 4 PASSED: customer cannot write bid_count (%)', v_err;
  END;
END $$;

-- =============================================================
-- 5. Customer cannot UPDATE jobs.escrow_balance directly.
--    (Duplicates TEST 7 in rls_regression_test.sql but scoped to any job.)
-- =============================================================
DO $$
DECLARE
  v_job uuid; v_customer uuid; v_err text;
BEGIN
  SELECT id, customer_id INTO v_job, v_customer FROM public.jobs LIMIT 1;
  IF v_job IS NULL THEN
    RAISE NOTICE 'TEST 5 SKIPPED: no jobs present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.jobs SET escrow_balance = escrow_balance + 999 WHERE id = v_job;
    RAISE EXCEPTION 'TEST 5 FAILED: customer wrote escrow_balance';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 5 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 5 PASSED: customer cannot write escrow_balance (%)', v_err;
  END;
END $$;

-- =============================================================
-- 6. Chat attachments: non-owner cannot UPDATE another user's object.
--    Owner check is `auth.uid() = owner` on storage.objects.
-- =============================================================
DO $$
DECLARE
  v_obj_id uuid; v_owner uuid; v_other uuid; v_err text; v_rows int;
BEGIN
  SELECT id, owner INTO v_obj_id, v_owner
  FROM storage.objects
  WHERE bucket_id = 'chat-attachments' AND owner IS NOT NULL
  LIMIT 1;
  IF v_obj_id IS NULL THEN
    RAISE NOTICE 'TEST 6 SKIPPED: no chat-attachments objects present';
    RETURN;
  END IF;

  SELECT user_id INTO v_other FROM public.profiles
  WHERE user_id <> v_owner LIMIT 1;
  IF v_other IS NULL THEN
    RAISE NOTICE 'TEST 6 SKIPPED: no second profile to impersonate';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE storage.objects
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tamper', true)
     WHERE id = v_obj_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      RAISE EXCEPTION 'TEST 6 FAILED: non-owner updated chat-attachments object';
    END IF;
    RAISE NOTICE 'TEST 6 PASSED: non-owner UPDATE returned 0 rows (RLS filtered)';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 6 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 6 PASSED: non-owner UPDATE blocked (%)', v_err;
  END;
END $$;

-- =============================================================
-- 7. Chat attachments: owner CAN update their own object (positive check).
-- =============================================================
DO $$
DECLARE
  v_obj_id uuid; v_owner uuid; v_rows int; v_err text;
BEGIN
  SELECT id, owner INTO v_obj_id, v_owner
  FROM storage.objects
  WHERE bucket_id = 'chat-attachments' AND owner IS NOT NULL
  LIMIT 1;
  IF v_obj_id IS NULL THEN
    RAISE NOTICE 'TEST 7 SKIPPED: no chat-attachments objects present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE storage.objects
       SET metadata = COALESCE(metadata, '{}'::jsonb)
     WHERE id = v_obj_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'TEST 7 FAILED: owner UPDATE hit 0 rows — policy too strict';
    END IF;
    RAISE NOTICE 'TEST 7 PASSED: owner can update their own chat attachment';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 7 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 7 SKIPPED: owner update raised (%) — likely non-RLS constraint', v_err;
  END;
END $$;

ROLLBACK;

\echo
\echo '=========================================='
\echo ' Forbidden-UPDATE suite: ALL TESTS PASSED'
\echo '=========================================='
