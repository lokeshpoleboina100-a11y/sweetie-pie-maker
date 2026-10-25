-- Bid price validation regression suite.
-- Asserts the validate_bid_amount trigger rejects invalid bid amounts
-- with clear messages and accepts valid ones.

BEGIN;

DO $$
DECLARE
  v_job uuid;
  v_worker uuid;
  v_err text;
BEGIN
  -- Pick a job the test worker has not bid on yet, so the unique
  -- (job_id, worker_id) constraint does not interfere with the valid insert.
  SELECT j.id, b1.worker_id INTO v_job, v_worker
  FROM public.bids b1
  CROSS JOIN public.jobs j
  WHERE j.id <> b1.job_id
    AND NOT EXISTS (
      SELECT 1 FROM public.bids b
      WHERE b.job_id = j.id AND b.worker_id = b1.worker_id
    )
  LIMIT 1;
  IF v_job IS NULL THEN
    RAISE NOTICE 'TEST SKIPPED: no eligible job/worker pair found';
    RETURN;
  END IF;

  -- 1. Zero amount is rejected.
  BEGIN
    INSERT INTO public.bids (job_id, worker_id, amount) VALUES (v_job, v_worker, 0);
    RAISE EXCEPTION 'TEST 1 FAILED: zero bid amount accepted';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  IF v_err NOT LIKE '%at least Rs 1%' THEN
    RAISE EXCEPTION 'TEST 1 FAILED: wrong error for zero amount: %', v_err;
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: zero amount rejected';

  -- 2. Negative amount is rejected.
  BEGIN
    INSERT INTO public.bids (job_id, worker_id, amount) VALUES (v_job, v_worker, -500);
    RAISE EXCEPTION 'TEST 2 FAILED: negative bid amount accepted';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  IF v_err NOT LIKE '%at least Rs 1%' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: wrong error for negative amount: %', v_err;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: negative amount rejected';

  -- 3. Amount above the maximum is rejected.
  BEGIN
    INSERT INTO public.bids (job_id, worker_id, amount) VALUES (v_job, v_worker, 10000001);
    RAISE EXCEPTION 'TEST 3 FAILED: over-maximum bid amount accepted';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
  END;
  IF v_err NOT LIKE '%cannot exceed%' THEN
    RAISE EXCEPTION 'TEST 3 FAILED: wrong error for over-max amount: %', v_err;
  END IF;
  RAISE NOTICE 'TEST 3 PASSED: over-maximum amount rejected';

  -- 4. Valid amount is accepted. Clear this worker's existing bids on the job
  -- first so the unique (job_id, worker_id) constraint does not interfere.
  BEGIN
    DELETE FROM public.bids WHERE job_id = v_job AND worker_id = v_worker;
    INSERT INTO public.bids (job_id, worker_id, amount) VALUES (v_job, v_worker, 1500);
    IF NOT EXISTS (SELECT 1 FROM public.bids WHERE job_id = v_job AND worker_id = v_worker AND amount = 1500) THEN
      RAISE EXCEPTION 'TEST 4 FAILED: valid bid amount not inserted';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 4 FAILED: valid bid amount rejected: %', SQLERRM;
  END;
  RAISE NOTICE 'TEST 4 PASSED: valid amount accepted';
END;
$$;

ROLLBACK;
