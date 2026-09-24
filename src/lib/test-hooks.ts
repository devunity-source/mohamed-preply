import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Test hooks exist only when the server was started with E2E_TEST_HOOKS=1 and
 * a long E2E_TEST_SECRET, and every call must carry that secret. Never set
 * these in a real deployment.
 */
export function testHookAllowed(req: Request): boolean {
  const secret = process.env.E2E_TEST_SECRET ?? "";
  const given = req.headers.get("x-e2e-secret") ?? "";
  const enabled = process.env.E2E_TEST_HOOKS === "1" && secret.length >= 24;
  return enabled && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}
