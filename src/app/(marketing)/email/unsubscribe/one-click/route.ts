import { validUnsubscribe } from "@/lib/email/links";
import { turnOffFromLink } from "@/lib/email/prefs";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here from their own
 * "Unsubscribe" button, named in each email's List-Unsubscribe header.
 */
export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const [u, k, t] = ["u", "k", "t"].map((f) => (q.get(f) ?? "").slice(0, 200));
  if (!validUnsubscribe(u, k, t)) return new Response("Not found", { status: 404 });
  await turnOffFromLink(u, k);
  return new Response("Unsubscribed", { status: 200 });
}
