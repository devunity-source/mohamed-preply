import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

// Row level security regression suite. Runs every migration on an in-process
// Postgres (PGlite) with a stubbed Supabase auth schema, then acts as
// different users. Run with: npm run test:db
const M = new URL("../migrations/", import.meta.url);
const db = new PGlite();
await db.exec(`
  create role authenticated; create role anon;
  create schema auth; create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant usage on schema public to authenticated, anon;
  alter default privileges in schema public grant all on tables to authenticated, anon;
`);
for (const f of readdirSync(M).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(new URL(f, M), "utf8"));
}
const U = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const [st, st2, ins, out, adm, ins2] = [1, 2, 3, 4, 11, 10].map(U);
const [C1, C2, PROG, ANN, GEN, GEN2, GLOBAL_ANN, A1] = [8, 20, 9, 7, 6, 21, 22, 5].map(U);
await db.exec(`
  insert into auth.users values ('${st}'),('${st2}'),('${ins}'),('${out}'),('${adm}'),('${ins2}');
  insert into profiles (id, full_name, handle, role) values ('${st}','Ahmed','ahmed','student'),('${st2}','Maria','maria','student'),
    ('${ins}','Rakan','rakan','instructor'),('${out}','Out','outsider','student'),('${adm}','Admin','admin','admin'),('${ins2}','Other','other','instructor');
  insert into programmes (id, slug, title, duration_weeks, price_cents, published) values ('${PROG}','devops','DevOps',6,59000,true);
  insert into cohorts (id, programme_id, code, name, starts_on, ends_on, status) values ('${C1}','${PROG}','#01','C1','2026-08-31','2026-10-11','active'),('${C2}','${PROG}','#02','C2','2026-11-01','2026-12-01','upcoming');
  insert into cohort_members values ('${C1}','${st}','student'),('${C1}','${st2}','student'),('${C1}','${ins}','instructor'),('${C2}','${ins2}','instructor');
  insert into spaces (id, slug, name, "group", cohort_id, read_only) values ('${ANN}','c-ann','Ann','C','${C1}',true),('${GEN}','c-gen','Gen','C','${C1}',false),
    ('${GEN2}','c2-gen','Gen2','C2','${C2}',false),('${GLOBAL_ANN}','ann','Announcements','General',null,true);
  insert into assignments (id, cohort_id, title, due_at) values ('${A1}','${C1}','A1', now() - interval '1 day');
  insert into certificates (id, user_id, cohort_id) values ('AM-DEV-2026-00001','${st}','${C1}');
`);
async function as(uid, sql) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.sub','${uid}',false);` : `set role anon; select set_config('request.jwt.sub','',false);`);
  try { return await db.query(sql); } catch (e) { return { error: e.message }; } finally { await db.exec(`reset role; select set_config('request.jwt.sub','',false);`); }
}
let fail = 0;
async function expect(label, want, p) {
  const x = await p;
  const got = x.error ? "deny" : (x.affectedRows ?? x.rows.length) === 0 && !x.rows?.length ? "none" : "ok";
  const pass = want === got || (want === "deny" && got === "none");
  if (!pass) fail++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(58)} want=${want} got=${got}${x.error ? "  (" + x.error.slice(0, 55) + ")" : x.rows?.length ? "  " + JSON.stringify(x.rows[0]).slice(0, 60) : ""}`);
  return x;
}
console.log("-- original checks");
await expect("student sees own cohort", "ok", as(st, `select * from cohorts`));
await expect("outsider sees no cohort", "none", as(out, `select * from cohorts`));
const post = await expect("student posts in cohort general", "ok", as(st, `insert into posts (space_id, author_id, title, body) values ('${GEN}','${st}','t','b') returning id`));
await expect("student posts in cohort announcements", "deny", as(st, `insert into posts (space_id, author_id, title, body) values ('${ANN}','${st}','t','b')`));
await expect("cohort instructor posts in cohort announcements", "ok", as(ins, `insert into posts (space_id, author_id, title, body) values ('${ANN}','${ins}','t','b') returning id`));
await expect("outsider reads cohort posts", "none", as(out, `select * from posts`));
await expect("student impersonates author", "deny", as(st, `insert into posts (space_id, author_id, title, body) values ('${GEN}','${st2}','t','b')`));
await expect("student submits", "ok", as(st, `insert into assignment_submissions (assignment_id, user_id, repo_url) values ('${A1}','${st}','https://github.com/a/b') returning id`));
await expect("maria submits", "ok", as(st2, `insert into assignment_submissions (assignment_id, user_id, repo_url) values ('${A1}','${st2}','https://github.com/m/b') returning id`));
await expect("student reads only own submission (1 row)", "ok", as(st, `select count(*)::int as n from assignment_submissions having count(*) = 1`));
await expect("cohort instructor reads both submissions", "ok", as(ins, `select count(*)::int as n from assignment_submissions having count(*) = 2`));
await expect("student promotes self to admin", "deny", as(st, `update profiles set role='admin' where id='${st}'`));
await expect("student inserts passed lab attempt", "deny", as(st, `insert into lab_attempts (lab_id,user_id,status) select gen_random_uuid(),'${st}','passed'`));
const pid = post.rows[0].id;
console.log("-- review exploits (all must be blocked)");
await expect("#3 student moves own post to announcements + pins", "deny", as(st, `update posts set space_id='${ANN}', pinned=true where id='${pid}'`));
await expect("#3 student pins own post in place", "deny", as(st, `update posts set pinned=true where id='${pid}'`));
await expect("#4 backdated insert is overridden to now()", "ok", as(st2, `update assignment_submissions set submitted_at = now() - interval '30 days' where user_id='${st2}' returning (submitted_at > now() - interval '1 minute') as server_time`));
await expect("#4 student re-points submission to other user", "deny", as(st, `update assignment_submissions set user_id='${st2}' where user_id='${st}'`));
await expect("#4 file_path outside own folder", "deny", as(st, `update assignment_submissions set file_path='${st2}/work.zip' where user_id='${st}'`));
await expect("#5 unrelated instructor sets price to 0", "deny", as(ins2, `update programmes set price_cents=0 returning price_cents`));
await expect("#5 cohort instructor sets price to 0", "deny", as(ins, `update programmes set price_cents=0 returning price_cents`));
await expect("#5 unrelated instructor reads other cohort roster", "none", as(ins2, `select * from cohort_members where cohort_id='${C1}'`));
await expect("#5 unrelated instructor deletes student post", "none", as(ins2, `delete from posts where id='${pid}' returning id`));
await expect("#5 instructor posts in campus announcements", "deny", as(ins, `insert into posts (space_id, author_id, title, body) values ('${GLOBAL_ANN}','${ins}','t','b')`));
await expect("#5 instructor adds campus-wide resource", "deny", as(ins, `insert into resources (kind, title, url) values ('slides','x','https://x')`));
const n = await db.query(`insert into notifications (user_id, text, href) values ('${st}','x','/dashboard') returning id`);
await expect("#7 student rewrites notification href", "deny", as(st, `update notifications set href='https://evil.example' where id='${n.rows[0].id}'`));
await expect("#10 anon scans certificates table", "deny", as(null, `select * from certificates`));
console.log("-- legitimate actions (must still work)");
await expect("student edits own post body", "ok", as(st, `update posts set body='edited' where id='${pid}' returning body`));
await expect("cohort instructor pins student post", "ok", as(ins, `update posts set pinned=true where id='${pid}' returning pinned`));
await expect("cohort instructor adds cohort resource", "ok", as(ins, `insert into resources (cohort_id, kind, title, url) values ('${C1}','slides','x','https://x') returning id`));
await expect("admin sets price", "ok", as(adm, `update programmes set price_cents=49000 returning price_cents`));
await expect("admin posts in campus announcements", "ok", as(adm, `insert into posts (space_id, author_id, title, body) values ('${GLOBAL_ANN}','${adm}','t','b') returning id`));
await expect("student marks notification read", "ok", as(st, `update notifications set read_at=now() where id='${n.rows[0].id}' returning read_at`));
await db.exec(`insert into grades (submission_id, grade, graded_by) select id, 80, '${ins}' from assignment_submissions where user_id='${st2}'`);
await expect("maria edits GRADED submission", "deny", as(st2, `update assignment_submissions set repo_url='https://github.com/x/y' where user_id='${st2}' returning id`));
await expect("student uploads into own folder", "ok", as(st, `update assignment_submissions set file_path='${st}/work.zip' where user_id='${st}' returning file_path`));
await expect("anon verifies certificate by id", "ok", as(null, `select * from verify_certificate('AM-DEV-2026-00001')`));
await expect("student reads own certificate", "ok", as(st, `select * from certificates`));
console.log("-- waitlist (0003)");
await expect("anon joins waitlist", "ok", as(null, `insert into waitlist (email, programme_id) values ('new@example.com','${PROG}')`));
await expect("anon joins with mixed-case email", "deny", as(null, `insert into waitlist (email, programme_id) values ('New@Example.com','${PROG}')`));
await expect("anon joins with invalid email", "deny", as(null, `insert into waitlist (email, programme_id) values ('not-an-email','${PROG}')`));
await expect("anon reads waitlist", "deny", as(null, `select * from waitlist`));
await expect("student reads waitlist", "none", as(st, `select * from waitlist`));
await expect("instructor reads waitlist", "none", as(ins, `select * from waitlist`));
await expect("anon edits a waitlist row", "deny", as(null, `update waitlist set email='x@evil.com'`));
await expect("admin reads waitlist", "ok", as(adm, `select email from waitlist`));
await db.exec(`update programmes set published=false`);
await expect("anon joins unpublished programme", "deny", as(null, `insert into waitlist (email, programme_id) values ('b@example.com','${PROG}')`));
console.log("-- teaching tools (0004)");
// Fixtures: a class in C1, a team of Ahmed (st) in C1, a locked-able post.
await db.exec(`insert into classes (id, cohort_id, title, starts_at) values ('${U(30)}','${C1}','K8s', now() - interval '1 day')`);
await expect("cohort instructor records attendance", "ok", as(ins, `insert into class_attendance values ('${U(30)}','${st}','present') returning status`));
await expect("student records own attendance", "deny", as(st, `insert into class_attendance values ('${U(30)}','${st2}','present')`));
await expect("unrelated instructor records attendance", "deny", as(ins2, `insert into class_attendance values ('${U(30)}','${st2}','late')`));

await expect("cohort instructor creates project", "ok", as(ins, `insert into projects (id, cohort_id, title, team_name) values ('${U(31)}','${C1}','Capstone','Team A') returning id`));
await expect("student creates project", "deny", as(st, `insert into projects (cohort_id, title, team_name) values ('${C1}','Mine','Solo')`));
await expect("unrelated instructor creates project in C1", "deny", as(ins2, `insert into projects (cohort_id, title, team_name) values ('${C1}','X','X')`));
await expect("cohort instructor adds team member", "ok", as(ins, `insert into project_members values ('${U(31)}','${st}') returning user_id`));
await expect("student adds self to team", "deny", as(st2, `insert into project_members values ('${U(31)}','${st2}')`));
await expect("member sets repo link", "ok", as(st, `update projects set repo_url='https://github.com/a/cap' where id='${U(31)}' returning repo_url`));
await expect("member renames team", "deny", as(st, `update projects set team_name='Renamed' where id='${U(31)}'`));
await expect("non-member edits project", "none", as(st2, `update projects set repo_url='https://evil' where id='${U(31)}' returning id`));
await expect("instructor adds milestone", "ok", as(ins, `insert into project_milestones (id, project_id, position, title, due_on) values ('${U(32)}','${U(31)}',1,'Proposal', now()) returning id`));
await expect("member ticks milestone (server time)", "ok", as(st, `update project_milestones set done_at = now() - interval '9 days' where id='${U(32)}' returning (done_at > now() - interval '1 minute') as server_time`));
await expect("member renames milestone", "deny", as(st, `update project_milestones set title='Easy' where id='${U(32)}'`));
await expect("non-member ticks milestone", "none", as(st2, `update project_milestones set done_at=null where id='${U(32)}' returning id`));
await expect("outsider reads milestones", "none", as(out, `select * from project_milestones`));

const lp = await as(st, `insert into posts (space_id, author_id, title, body) values ('${GEN}','${st}','q','b') returning id`);
await expect("author locks own post", "deny", as(st, `update posts set locked=true where id='${lp.rows[0].id}'`));
await expect("cohort instructor locks post", "ok", as(ins, `update posts set locked=true where id='${lp.rows[0].id}' returning locked`));
await expect("reply to locked post", "deny", as(st2, `insert into comments (post_id, author_id, body) values ('${lp.rows[0].id}','${st2}','hi')`));
await expect("instructor gives rubric scores", "ok", as(ins, `insert into grades (submission_id, grade, graded_by, rubric_scores) select id, 90, '${ins}', '{"works":36}'::jsonb from assignment_submissions where user_id='${st}' returning grade`));

await expect("admin issues certificate", "ok", as(adm, `insert into certificates (id, user_id, cohort_id, issued_by) values ('AM-DEV-2026-00002','${st2}','${C1}','${adm}') returning id`));
await expect("instructor issues certificate", "deny", as(ins, `insert into certificates (id, user_id, cohort_id, issued_by) values ('AM-DEV-2026-00003','${st}','${C1}','${ins}')`));
await expect("student revokes own certificate", "none", as(st, `update certificates set revoked_at=now() where user_id='${st}' returning id`));
await expect("admin revokes certificate", "ok", as(adm, `update certificates set revoked_at=now() where id='AM-DEV-2026-00002' returning revoked_at`));
await expect("verify reports revocation", "ok", as(null, `select revoked_at from verify_certificate('AM-DEV-2026-00002') where revoked_at is not null`));

console.log("-- 0005 ux state");
await expect("student marks own space read", "ok", as(st, `insert into space_reads (user_id, space_id) values ('${st}','${GEN}') returning last_seen_at`));
await expect("student updates own read time", "ok", as(st, `update space_reads set last_seen_at=now() where user_id='${st}' returning space_id`));
await expect("student writes read row for someone else", "deny", as(st, `insert into space_reads (user_id, space_id) values ('${st2}','${GEN}')`));
await expect("outsider records read of hidden cohort space", "deny", as(out, `insert into space_reads (user_id, space_id) values ('${out}','${GEN}')`));
await expect("student marks read of other cohort's space", "deny", as(st, `insert into space_reads (user_id, space_id) values ('${st}','${GEN2}')`));
await expect("classmate reads another's read times", "none", as(st2, `select * from space_reads`));
await expect("student dismisses own welcome", "ok", as(st, `update profiles set onboarded_at=now() where id='${st}' returning onboarded_at`));
await expect("student dismisses someone else's welcome", "none", as(st, `update profiles set onboarded_at=now() where id='${st2}' returning id`));
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
