-- RLS / permissions regression suite.
--
-- Run with:  psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_regression_test.sql
--
-- All work is wrapped in BEGIN/ROLLBACK; the database is not mutated.
-- Each test RAISE NOTICEs on pass and RAISE EXCEPTIONs on fail, so a
-- non-zero psql exit code means a regression.

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================
-- 1. Every public base table must have RLS enabled.
-- =============================================================
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(c.relname, ', ')
    INTO v_bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 1 FAILED: tables without RLS: %', v_bad;
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: every public table has RLS enabled';
END $$;

-- =============================================================
-- 2. Every public base table must have at least one policy.
-- =============================================================
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(c.relname, ', ')
    INTO v_bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT EXISTS (
      SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    );

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 2 FAILED: RLS enabled but no policies on: %', v_bad;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: every public table has at least one policy';
END $$;

-- =============================================================
-- 3. Data-API GRANTs: authenticated and service_role must have
--    at least one of SELECT/INSERT/UPDATE/DELETE on every public table.
-- =============================================================
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(format('%s(%s)', table_name, grantee), ', ')
    INTO v_bad
  FROM (
    SELECT c.relname AS table_name, r.role_name AS grantee
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN (VALUES ('authenticated'), ('service_role')) AS r(role_name)
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants g
        WHERE g.table_schema = 'public'
          AND g.table_name = c.relname
          AND g.grantee = r.role_name
          AND g.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
      )
  ) t;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 3 FAILED: missing Data-API grants: %', v_bad;
  END IF;
  RAISE NOTICE 'TEST 3 PASSED: Data-API grants present on every public table';
END $$;

-- =============================================================
-- 4. No SECURITY DEFINER function in public may be executable by anon.
-- =============================================================
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(p.proname, ', ')
    INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 4 FAILED: anon can EXECUTE SECURITY DEFINER funcs: %', v_bad;
  END IF;
  RAISE NOTICE 'TEST 4 PASSED: no SECURITY DEFINER function is anon-executable';
END $$;

-- =============================================================
-- 5. user_roles must NOT be readable by anon (privilege-escalation guard).
-- =============================================================
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.user_roles', 'SELECT') THEN
    RAISE EXCEPTION 'TEST 5 FAILED: anon has SELECT on user_roles';
  END IF;
  RAISE NOTICE 'TEST 5 PASSED: user_roles is hidden from anon';
END $$;

-- =============================================================
-- 6. profiles.phone must not leak: anonymous Data-API reads blocked.
--    Simulate an anon JWT and confirm no rows are visible.
-- =============================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role', 'anon')::text,
    true
  );
  SET LOCAL role anon;
  SELECT count(*) INTO v_count FROM public.profiles;
  RESET role;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 6 FAILED: anon read % profile rows', v_count;
  END IF;
  RAISE NOTICE 'TEST 6 PASSED: anon cannot read profiles';
END $$;

-- =============================================================
-- 7. Customers cannot directly write jobs.escrow_balance.
-- =============================================================
DO $$
DECLARE
  v_job uuid;
  v_customer uuid;
  v_err text;
BEGIN
  SELECT id, customer_id INTO v_job, v_customer
  FROM public.jobs WHERE accepted_worker_id IS NOT NULL LIMIT 1;
  IF v_job IS NULL THEN
    RAISE NOTICE 'TEST 7 SKIPPED: no accepted job present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    UPDATE public.jobs SET escrow_balance = escrow_balance + 999 WHERE id = v_job;
    RAISE EXCEPTION 'TEST 7 FAILED: customer wrote escrow_balance directly';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 7 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 7 PASSED: direct escrow_balance write blocked (%)', v_err;
  END;
END $$;

-- =============================================================
-- 8. Payments inserted by the customer are forced to status='pending'.
-- =============================================================
DO $$
DECLARE
  v_job uuid; v_customer uuid; v_worker uuid;
  v_err text;
BEGIN
  SELECT id, customer_id, accepted_worker_id INTO v_job, v_customer, v_worker
  FROM public.jobs WHERE accepted_worker_id IS NOT NULL LIMIT 1;
  IF v_job IS NULL THEN
    RAISE NOTICE 'TEST 8 SKIPPED: no accepted job present';
    RETURN;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_customer, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    INSERT INTO public.payments
      (job_id, customer_id, worker_id, amount, commission, payment_method, status)
    VALUES (v_job, v_customer, v_worker, 100, 10, 'upi', 'completed');
    RAISE EXCEPTION 'TEST 8 FAILED: customer inserted payment status=completed';
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err LIKE 'TEST 8 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'TEST 8 PASSED: payment insert forced to pending (%)', v_err;
  END;
END $$;

ROLLBACK;

\echo
\echo '=========================================='
\echo ' RLS regression suite: ALL TESTS PASSED'
\echo '=========================================='
