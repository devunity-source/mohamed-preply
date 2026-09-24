import { resetStore } from "@/lib/data/store";
import { createSeed } from "@/lib/data/seed";
import { loadDemo } from "@/lib/data/seed-supabase";
import { demoPassword } from "@/lib/auth/config";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";
import { resetRateLimits } from "@/lib/rate-limit";
import { clearOutbox } from "@/lib/email/send";
import { testHookAllowed } from "@/lib/test-hooks";

/**
 * Test hook for the end-to-end suite: reseeds the demo data so each test
 * starts from the same state (in memory, or in the local test Supabase). It does not exist unless the server was
 * started with E2E_TEST_HOOKS=1 and a long E2E_TEST_SECRET, and every call
 * must carry that secret. Never set these in a real deployment.
 */
export async function POST(req: Request) {
  if (!testHookAllowed(req)) return new Response("Not found", { status: 404 });
  if (supabaseEnabled()) {
    const sb = createAdminClient();
    if (!sb) return new Response("SUPABASE_SECRET_KEY is needed", { status: 500 });
    await loadDemo(sb, createSeed(), demoPassword() ?? "");
  } else {
    resetStore();
  }
  resetRateLimits();
  clearOutbox();
  return Response.json({ ok: true });
}
