// Joins every migration into one file to paste into Supabase's SQL Editor.
// Run with: npm run db:bundle  (writes supabase/all-migrations.sql, not committed)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const body = files.map((f) => `-- ===== ${f} =====\n${readFileSync(new URL(f, dir), "utf8").trim()}\n`).join("\n");
const out = new URL("../supabase/all-migrations.sql", import.meta.url);
// One transaction: if any statement fails, nothing is applied and you can
// fix the problem and run it again from the top.
writeFileSync(out, `-- AcadeMe database setup: ${files.join(", ")}\nbegin;\n\n${body}\ncommit;\n`);
console.log(
  `Wrote supabase/all-migrations.sql (${files.length} migrations). Paste it into Supabase > SQL Editor and run.`,
);
