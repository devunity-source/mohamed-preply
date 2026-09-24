// Checks that a Supabase project is ready for AcadeMe. Read-only: it never
// changes anything, so it's safe against the real project.
//
// Run with: npm run db:check   (reads the keys from .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

let problems = 0;
function report(ok: boolean, what: string, fix: string) {
  console.log(`${ok ? "✓" : "✗"} ${what}${ok ? "" : `\n    ${fix}`}`);
  if (!ok) problems++;
}

async function main() {
  report(!!url && !!publishable, "Supabase URL and publishable key are set", "Add them to .env.local.");
  report(!!secret, "SUPABASE_SECRET_KEY is set", "Add it to .env.local (Project Settings > API Keys).");
  if (!url || !publishable || !secret) return;
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const visitor = createClient(url, publishable, opts);
  const server = createClient(url, secret, opts);

  const snapshot = await visitor.rpc("app_snapshot");
  report(
    !snapshot.error,
    "Migrations up to 0011 are applied",
    "npm run db:bundle -- 0011, then run it in the SQL Editor.",
  );
  const lookup = await server.rpc("user_id_by_email", { lookup: "nobody@example.com" });
  report(
    !lookup.error,
    "Migration 0010 (accounts and invites) is applied",
    "Run migration 0010 (see docs/supabase-setup.md).",
  );
  const blocked = await visitor.rpc("user_id_by_email", { lookup: "nobody@example.com" });
  report(
    !!blocked.error,
    "Visitors can't look up accounts by email",
    "Re-run migration 0010: its permissions are missing.",
  );

  const { count: programmes } = await server.from("programmes").select("*", { count: "exact", head: true });
  report((programmes ?? 0) > 0, `Curriculum is loaded (${programmes ?? 0} programmes)`, "npm run db:seed");
  const published = (snapshot.data as { programmes?: unknown[] } | null)?.programmes?.length ?? 0;
  report(published > 0, `Visitors see published programmes (${published})`, "Publish one in Admin > Programmes.");

  const { count: admins } = await server
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  report((admins ?? 0) > 0, `There's an admin (${admins ?? 0})`, "docs/supabase-setup.md, step 6.");
}

main()
  .catch((e) => {
    console.log(`✗ Couldn't reach Supabase: ${e instanceof Error ? e.message : e}`);
    problems++;
  })
  .finally(() => {
    console.log(problems ? `\n${problems} to fix.` : "\nAll good.");
    process.exit(problems ? 1 : 0);
  });
