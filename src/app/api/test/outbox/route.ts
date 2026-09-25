import { outbox } from "@/lib/email/send";
import { testHookAllowed } from "@/lib/test-hooks";

/** Test hook: the emails "sent" since the last reset. Same gate as /api/test/reset. */
export async function GET(req: Request) {
  if (!testHookAllowed(req)) return new Response("Not found", { status: 404 });
  return Response.json(outbox());
}
