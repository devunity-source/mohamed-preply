import { waitlistRows } from "@/lib/data/admin";
import { isAdmin } from "@/lib/authz";
import { getSessionUser } from "@/lib/session";

// Neutralise spreadsheet formulas (CSV injection): anything a visitor typed
// that starts with = + - @ or a control character is prefixed with a quote.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return new Response("Not found", { status: 404 });

  const lines = [
    ["email", "programme", "joined_at"].join(","),
    ...waitlistRows().map((r) => [cell(r.email), cell(r.programme.title), cell(r.createdAt.toISOString())].join(",")),
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="academe-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
