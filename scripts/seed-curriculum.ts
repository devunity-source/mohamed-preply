// Loads the curriculum into Supabase: the DevOps and AI programmes, their
// weekly modules and lessons, and the campus-wide community spaces. No
// people, cohorts, posts or grades. Safe to run again: it only adds what's
// missing and never overwrites edits (rows with no translations yet get the
// Arabic ones).
//
// Run with: npm run db:seed   (reads NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SECRET_KEY from .env.local)
import { createClient } from "@supabase/supabase-js";
import { createSeed } from "@/lib/data/seed";
import { seedCurriculum } from "@/lib/data/seed-supabase";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { added, translated } = await seedCurriculum(sb, createSeed());
  for (const [table, n] of Object.entries(added)) {
    console.log(`${table.padEnd(18)} ${n} added, ${translated[table] ?? 0} given Arabic`);
  }
  console.log("Done. Existing rows were left as they were, apart from adding missing Arabic.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
