// Joins migrations into one file to paste into Supabase's SQL Editor.
//   npm run db:bundle            every migration (a new project)
//   npm run db:bundle -- 0011    from 0011 on (a project that has the earlier ones)
// Writes supabase/all-migrations.sql, which isn't committed.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const from = process.argv[2] ?? "";
const dir = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && f >= from)
  .sort();
if (files.length === 0) {
  console.error(`No migrations from "${from}".`);
  process.exit(1);
}
const body = files.map((f) => `-- ===== ${f} =====\n${readFileSync(new URL(f, dir), "utf8").trim()}\n`).join("\n");
const out = new URL("../supabase/all-migrations.sql", import.meta.url);
// One transaction: if any statement fails, nothing is applied and you can
// fix the problem and run it again from the top.
writeFileSync(out, `-- AcadeMe database setup: ${files.join(", ")}\nbegin;\n\n${body}\ncommit;\n`);
console.log(`Wrote supabase/all-migrations.sql (${files.join(", ")}). Paste it into Supabase > SQL Editor and run.`);
