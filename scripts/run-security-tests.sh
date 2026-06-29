#!/usr/bin/env bash
# Run the Supabase SQL security regression suite.
#
# Requires either:
#   - SUPABASE_DB_URL env var (preferred for CI), or
#   - PG* env vars (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE)
#
# Exit code 0 = all tests passed; non-zero = at least one regression.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$HERE/../supabase/tests"

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  PSQL=(psql "$SUPABASE_DB_URL")
else
  PSQL=(psql)
fi

shopt -s nullglob
FILES=("$TESTS_DIR"/*_test.sql)
if (( ${#FILES[@]} == 0 )); then
  echo "No *_test.sql files found in $TESTS_DIR" >&2
  exit 1
fi

FAIL=0
for f in "${FILES[@]}"; do
  echo
  echo "▶ Running $(basename "$f")"
  echo "────────────────────────────────────────"
  if ! "${PSQL[@]}" -v ON_ERROR_STOP=1 -f "$f"; then
    echo "✗ FAILED: $(basename "$f")"
    FAIL=1
  fi
done

echo
if (( FAIL == 0 )); then
  echo "✅ All Supabase security regression tests passed."
else
  echo "❌ One or more security regression tests failed."
  exit 1
fi
