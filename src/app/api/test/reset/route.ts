import { timingSafeEqual } from "node:crypto";
import { resetStore } from "@/lib/data/store";
import { resetRateLimits } from "@/lib/rate-limit";

/**
 * Test hook for the end-to-end suite: reseeds the in-memory demo data so each
 * test starts from the same state. It does not exist unless the server was
 * started with E2E_TEST_HOOKS=1 and a long E2E_TEST_SECRET, and every call
 * must carry that secret. Never set these in a real deployment.
 */
export async function POST(req: Request) {
  const secret = process.env.E2E_TEST_SECRET ?? "";
  const given = req.headers.get("x-e2e-secret") ?? "";
  const enabled = process.env.E2E_TEST_HOOKS === "1" && secret.length >= 24;
  const matches = given.length === secret.length && enabled && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!enabled || !matches) return new Response("Not found", { status: 404 });
  resetStore();
  resetRateLimits();
  return Response.json({ ok: true });
}
