# Security regression suite

Automated checks that guard the Supabase backend against permission/RLS
regressions. Wired into CI via `.github/workflows/security-regression.yml`.

## What it covers

The SQL suite in `supabase/tests/*_test.sql` asserts:

1. **RLS enabled** on every `public` base table.
2. **At least one policy** exists on every `public` base table.
3. **Data-API GRANTs** present for `authenticated` and `service_role` on
   every `public` base table (PostgREST returns "permission denied" without
   them, even when RLS would allow access).
4. **No SECURITY DEFINER function** in `public` is executable by `anon`.
5. **`user_roles` not readable by `anon`** — privilege-escalation guard.
6. **`profiles` not readable by `anon`** — phone-number scraping guard.
7. **`jobs.escrow_balance`** cannot be written directly by a customer; it
   only moves through the escrow trigger.
8. **`payments.status`** is forced to `pending` when inserted by a customer
   — completion must go through the server-side verification path.

Plus the older targeted tests:

- `payments_status_pending_test.sql` — full status-flip rejection flow.
- `payments_server_confirm_test.sql` — server-side confirmation succeeds.
- `forbidden_updates_test.sql` — column-level write guards: workers
  cannot change `bids.amount` / `bids.status`; customers cannot change
  `jobs.accepted_worker_id` / `bid_count` / `escrow_balance`; non-owners
  cannot UPDATE `chat-attachments` storage objects (owner can).

Every test runs inside `BEGIN ... ROLLBACK`, so the database is never
mutated.

## Running locally

```bash
# Using SUPABASE_DB_URL (recommended):
SUPABASE_DB_URL="postgresql://..." bash scripts/run-security-tests.sh

# Or with PG* env vars already exported:
bash scripts/run-security-tests.sh
```

A non-zero exit code means at least one regression — read the `ERROR`
line to see which test caught it.

## CI jobs

`.github/workflows/security-regression.yml` runs three jobs:

| Job | Purpose | Required secret |
|---|---|---|
| `sql-rls-suite` | Runs the SQL suite above | `SUPABASE_DB_URL` (staging/preview DB) |
| `npm-audit` | Fails on any high/critical npm advisory | — |
| `supabase-linter` | Runs `supabase db lint --level warning` | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` |

> ⚠️ Point `SUPABASE_DB_URL` at a **staging or preview** database, never
> production. The suite uses `BEGIN/ROLLBACK` but should still run against
> a disposable environment.

## Adding a new test

1. Drop a `*_test.sql` file into `supabase/tests/`.
2. Wrap work in `BEGIN; ... ROLLBACK;`.
3. Use `RAISE NOTICE 'TEST n PASSED: ...'` on success and
   `RAISE EXCEPTION 'TEST n FAILED: ...'` on failure — a raised exception
   makes psql exit non-zero, which fails CI.
4. If a test needs to impersonate `anon` or `authenticated`, wrap
   `SET LOCAL role anon;` in a `BEGIN ... EXCEPTION WHEN insufficient_privilege`
   block so local sandboxes that lack role membership skip cleanly.
