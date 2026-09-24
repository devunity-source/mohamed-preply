#!/usr/bin/env bash
# Runs the browser suite against a throwaway local Supabase (needs Docker).
# Every test wipes and reloads the data, so never point this at a real project.
#   npm run test:e2e:supabase               whole suite
#   npm run test:e2e:supabase -- auth       one spec file
set -euo pipefail
cd "$(dirname "$0")/.."

SUPABASE="${SUPABASE_CLI:-npx --yes supabase@2}"
$SUPABASE start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta >/dev/null

# API_URL, PUBLISHABLE_KEY, SECRET_KEY, MAILPIT_URL... of the local stack.
while IFS='=' read -r key value; do
  export "LOCAL_$key=${value//\"/}"
done < <($SUPABASE status -o env 2>/dev/null)

# The test-only loader (never in the migrations).
docker exec -i supabase_db_academe psql -q -U postgres -d postgres < supabase/tests/e2e-setup.sql

export E2E_SUPABASE_URL="$LOCAL_API_URL"
export E2E_SUPABASE_PUBLISHABLE_KEY="$LOCAL_PUBLISHABLE_KEY"
export E2E_SUPABASE_SECRET_KEY="$LOCAL_SECRET_KEY"
export E2E_MAILPIT_URL="$LOCAL_MAILPIT_URL"
npx playwright test "$@"
