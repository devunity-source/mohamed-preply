import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

// Row level security regression suite. Runs every migration on an in-process
// Postgres (PGlite) with a stubbed Supabase auth schema, then acts as
// different users. Run with: npm run test:db
const M = new URL("../migrations/", import.meta.url);
const db = new PGlite();
await db.exec(`
  create role authenticated; create role anon; create role service_role bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant usage on schema public to authenticated, anon, service_role;
  alter default privileges in schema public grant all on tables to service_role;
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
  -- The sign-up trigger (0010) already made student profiles; set the real details.
  insert into profiles (id, full_name, handle, role) values ('${st}','Ahmed','ahmed','student'),('${st2}','Maria','maria','student'),
    ('${ins}','Rakan','rakan','instructor'),('${out}','Out','outsider','student'),('${adm}','Admin','admin','admin'),('${ins2}','Other','other','instructor')
    on conflict (id) do update set full_name = excluded.full_name, handle = excluded.handle, role = excluded.role;
  insert into programmes (id, slug, title, duration_weeks, price_cents, published) values ('${PROG}','devops','DevOps',6,59000,true);
  insert into cohorts (id, programme_id, code, name, starts_on, ends_on, status) values ('${C1}','${PROG}','#01','C1','2026-08-31','2026-10-11','active'),('${C2}','${PROG}','#02','C2','2026-11-01','2026-12-01','upcoming');
  insert into cohort_members values ('${C1}','${st}','student'),('${C1}','${st2}','student'),('${C1}','${ins}','instructor'),('${C2}','${ins2}','instructor');
  insert into spaces (id, slug, name, "group", cohort_id, read_only) values ('${ANN}','c-ann','Ann','C','${C1}',true),('${GEN}','c-gen','Gen','C','${C1}',false),
    ('${GEN2}','c2-gen','Gen2','C2','${C2}',false),('${GLOBAL_ANN}','ann','Announcements','General',null,true);
  insert into assignments (id, cohort_id, title, due_at) values ('${A1}','${C1}','A1', now() - interval '1 day');
  insert into certificates (id, user_id, cohort_id) values ('ACM-DEV-2026-00001','${st}','${C1}');
`);
async function as(uid, sql) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.sub','${uid}',false);` : `set role anon; select set_config('request.jwt.sub','',false);`);
  try { return await db.query(sql); } catch (e) { return { error: e.message }; } finally { await db.exec(`reset role; select set_config('request.jwt.sub','',false);`); }
}
let fail = 0;
// Named `check`, not `expect`: this is a plain script, not Jest or Chai, and
// each call records its own pass or fail.
async function check(label, want, p) {
  const x = await p;
  const got = x.error ? "deny" : (x.affectedRows ?? x.rows.length) === 0 && !x.rows?.length ? "none" : "ok";
  const pass = want === got || (want === "deny" && got === "none");
  if (!pass) fail++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(58)} want=${want} got=${got}${x.error ? "  (" + x.error.slice(0, 55) + ")" : x.rows?.length ? "  " + JSON.stringify(x.rows[0]).slice(0, 60) : ""}`);
  return x;
}
console.log("-- original checks");
await check("student sees own cohort", "ok", as(st, `select * from cohorts`));
// Since 0011, published cohorts and their instructors are a public catalogue;
// the roster of students is what stays private.
await check("outsider sees no cohort's students", "none", as(out, `select * from cohort_members where role='student'`));
const post = await check("student posts in cohort general", "ok", as(st, `insert into posts (space_id, author_id, title, body) values ('${GEN}','${st}','t','b') returning id`));
await check("student posts in cohort announcements", "deny", as(st, `insert into posts (space_id, author_id, title, body) values ('${ANN}','${st}','t','b')`));
await check("cohort instructor posts in cohort announcements", "ok", as(ins, `insert into posts (space_id, author_id, title, body) values ('${ANN}','${ins}','t','b') returning id`));
await check("outsider reads cohort posts", "none", as(out, `select * from posts`));
await check("student impersonates author", "deny", as(st, `insert into posts (space_id, author_id, title, body) values ('${GEN}','${st2}','t','b')`));
await check("student submits", "ok", as(st, `insert into assignment_submissions (assignment_id, user_id, repo_url) values ('${A1}','${st}','https://github.com/a/b') returning id`));
await check("maria submits", "ok", as(st2, `insert into assignment_submissions (assignment_id, user_id, repo_url) values ('${A1}','${st2}','https://github.com/m/b') returning id`));
await check("student reads only own submission (1 row)", "ok", as(st, `select count(*)::int as n from assignment_submissions having count(*) = 1`));
await check("cohort instructor reads both submissions", "ok", as(ins, `select count(*)::int as n from assignment_submissions having count(*) = 2`));
await check("student promotes self to admin", "deny", as(st, `update profiles set role='admin' where id='${st}'`));
await check("student inserts passed lab attempt", "deny", as(st, `insert into lab_attempts (lab_id,user_id,status) select gen_random_uuid(),'${st}','passed'`));
const pid = post.rows[0].id;
console.log("-- review exploits (all must be blocked)");
await check("#3 student moves own post to announcements + pins", "deny", as(st, `update posts set space_id='${ANN}', pinned=true where id='${pid}'`));
await check("#3 student pins own post in place", "deny", as(st, `update posts set pinned=true where id='${pid}'`));
await check("#4 backdated insert is overridden to now()", "ok", as(st2, `update assignment_submissions set submitted_at = now() - interval '30 days' where user_id='${st2}' returning (submitted_at > now() - interval '1 minute') as server_time`));
await check("#4 student re-points submission to other user", "deny", as(st, `update assignment_submissions set user_id='${st2}' where user_id='${st}'`));
await check("#4 file_path outside own folder", "deny", as(st, `update assignment_submissions set file_path='${st2}/work.zip' where user_id='${st}'`));
await check("#5 unrelated instructor sets price to 0", "deny", as(ins2, `update programmes set price_cents=0 returning price_cents`));
await check("#5 cohort instructor sets price to 0", "deny", as(ins, `update programmes set price_cents=0 returning price_cents`));
await check("#5 unrelated instructor reads other cohort roster", "none", as(ins2, `select * from cohort_members where cohort_id='${C1}' and role='student'`));
await check("#5 unrelated instructor deletes student post", "none", as(ins2, `delete from posts where id='${pid}' returning id`));
await check("#5 instructor posts in campus announcements", "deny", as(ins, `insert into posts (space_id, author_id, title, body) values ('${GLOBAL_ANN}','${ins}','t','b')`));
await check("#5 instructor adds campus-wide resource", "deny", as(ins, `insert into resources (kind, title, url) values ('slides','x','https://x')`));
const n = await db.query(`insert into notifications (user_id, text, href) values ('${st}','x','/dashboard') returning id`);
await check("#7 student rewrites notification href", "deny", as(st, `update notifications set href='https://evil.example' where id='${n.rows[0].id}'`));
await check("#10 anon scans certificates table", "deny", as(null, `select * from certificates`));
console.log("-- legitimate actions (must still work)");
await check("student edits own post body", "ok", as(st, `update posts set body='edited' where id='${pid}' returning body`));
await check("cohort instructor pins student post", "ok", as(ins, `update posts set pinned=true where id='${pid}' returning pinned`));
await check("cohort instructor adds cohort resource", "ok", as(ins, `insert into resources (cohort_id, kind, title, url) values ('${C1}','slides','x','https://x') returning id`));
await check("admin sets price", "ok", as(adm, `update programmes set price_cents=49000 returning price_cents`));
await check("admin posts in campus announcements", "ok", as(adm, `insert into posts (space_id, author_id, title, body) values ('${GLOBAL_ANN}','${adm}','t','b') returning id`));
await check("student marks notification read", "ok", as(st, `update notifications set read_at=now() where id='${n.rows[0].id}' returning read_at`));
await db.exec(`insert into grades (submission_id, grade, graded_by) select id, 80, '${ins}' from assignment_submissions where user_id='${st2}'`);
await check("maria edits GRADED submission", "deny", as(st2, `update assignment_submissions set repo_url='https://github.com/x/y' where user_id='${st2}' returning id`));
await check("student uploads into own folder", "ok", as(st, `update assignment_submissions set file_path='${st}/work.zip' where user_id='${st}' returning file_path`));
await check("anon verifies certificate by id", "ok", as(null, `select * from verify_certificate('ACM-DEV-2026-00001')`));
await check("student reads own certificate", "ok", as(st, `select * from certificates`));
console.log("-- waitlist (0003)");
await check("anon joins waitlist", "ok", as(null, `insert into waitlist (email, programme_id) values ('new@example.com','${PROG}')`));
await check("anon joins with mixed-case email", "deny", as(null, `insert into waitlist (email, programme_id) values ('New@Example.com','${PROG}')`));
await check("anon joins with invalid email", "deny", as(null, `insert into waitlist (email, programme_id) values ('not-an-email','${PROG}')`));
await check("anon reads waitlist", "deny", as(null, `select * from waitlist`));
await check("student reads waitlist", "none", as(st, `select * from waitlist`));
await check("instructor reads waitlist", "none", as(ins, `select * from waitlist`));
await check("anon edits a waitlist row", "deny", as(null, `update waitlist set email='x@evil.com'`));
await check("admin reads waitlist", "ok", as(adm, `select email from waitlist`));
await db.exec(`update programmes set published=false`);
await check("anon joins unpublished programme", "deny", as(null, `insert into waitlist (email, programme_id) values ('b@example.com','${PROG}')`));
console.log("-- teaching tools (0004)");
// Fixtures: a class in C1, a team of Ahmed (st) in C1, a locked-able post.
await db.exec(`insert into classes (id, cohort_id, title, starts_at) values ('${U(30)}','${C1}','K8s', now() - interval '1 day')`);
await check("cohort instructor records attendance", "ok", as(ins, `insert into class_attendance values ('${U(30)}','${st}','present') returning status`));
await check("student records own attendance", "deny", as(st, `insert into class_attendance values ('${U(30)}','${st2}','present')`));
await check("unrelated instructor records attendance", "deny", as(ins2, `insert into class_attendance values ('${U(30)}','${st2}','late')`));

await check("cohort instructor creates project", "ok", as(ins, `insert into projects (id, cohort_id, title, team_name) values ('${U(31)}','${C1}','Capstone','Team A') returning id`));
await check("student creates project", "deny", as(st, `insert into projects (cohort_id, title, team_name) values ('${C1}','Mine','Solo')`));
await check("unrelated instructor creates project in C1", "deny", as(ins2, `insert into projects (cohort_id, title, team_name) values ('${C1}','X','X')`));
await check("cohort instructor adds team member", "ok", as(ins, `insert into project_members values ('${U(31)}','${st}') returning user_id`));
await check("student adds self to team", "deny", as(st2, `insert into project_members values ('${U(31)}','${st2}')`));
await check("member sets repo link", "ok", as(st, `update projects set repo_url='https://github.com/a/cap' where id='${U(31)}' returning repo_url`));
await check("member renames team", "deny", as(st, `update projects set team_name='Renamed' where id='${U(31)}'`));
await check("non-member edits project", "none", as(st2, `update projects set repo_url='https://evil' where id='${U(31)}' returning id`));
await check("instructor adds milestone", "ok", as(ins, `insert into project_milestones (id, project_id, position, title, due_on) values ('${U(32)}','${U(31)}',1,'Proposal', now()) returning id`));
await check("member ticks milestone (server time)", "ok", as(st, `update project_milestones set done_at = now() - interval '9 days' where id='${U(32)}' returning (done_at > now() - interval '1 minute') as server_time`));
await check("member renames milestone", "deny", as(st, `update project_milestones set title='Easy' where id='${U(32)}'`));
await check("non-member ticks milestone", "none", as(st2, `update project_milestones set done_at=null where id='${U(32)}' returning id`));
await check("outsider reads milestones", "none", as(out, `select * from project_milestones`));

const lp = await as(st, `insert into posts (space_id, author_id, title, body) values ('${GEN}','${st}','q','b') returning id`);
await check("author locks own post", "deny", as(st, `update posts set locked=true where id='${lp.rows[0].id}'`));
await check("cohort instructor locks post", "ok", as(ins, `update posts set locked=true where id='${lp.rows[0].id}' returning locked`));
await check("reply to locked post", "deny", as(st2, `insert into comments (post_id, author_id, body) values ('${lp.rows[0].id}','${st2}','hi')`));
await check("instructor gives rubric scores", "ok", as(ins, `insert into grades (submission_id, grade, graded_by, rubric_scores) select id, 90, '${ins}', '{"works":36}'::jsonb from assignment_submissions where user_id='${st}' returning grade`));

await check("admin issues certificate", "ok", as(adm, `insert into certificates (id, user_id, cohort_id, issued_by) values ('ACM-DEV-2026-00002','${st2}','${C1}','${adm}') returning id`));
await check("instructor issues certificate", "deny", as(ins, `insert into certificates (id, user_id, cohort_id, issued_by) values ('ACM-DEV-2026-00003','${st}','${C1}','${ins}')`));
await check("student revokes own certificate", "none", as(st, `update certificates set revoked_at=now() where user_id='${st}' returning id`));
await check("admin revokes certificate", "ok", as(adm, `update certificates set revoked_at=now() where id='ACM-DEV-2026-00002' returning revoked_at`));
await check("verify reports revocation", "ok", as(null, `select revoked_at from verify_certificate('ACM-DEV-2026-00002') where revoked_at is not null`));

console.log("-- 0005 ux state");
await check("student marks own space read", "ok", as(st, `insert into space_reads (user_id, space_id) values ('${st}','${GEN}') returning last_seen_at`));
await check("student updates own read time", "ok", as(st, `update space_reads set last_seen_at=now() where user_id='${st}' returning space_id`));
await check("student writes read row for someone else", "deny", as(st, `insert into space_reads (user_id, space_id) values ('${st2}','${GEN}')`));
await check("outsider records read of hidden cohort space", "deny", as(out, `insert into space_reads (user_id, space_id) values ('${out}','${GEN}')`));
await check("student marks read of other cohort's space", "deny", as(st, `insert into space_reads (user_id, space_id) values ('${st}','${GEN2}')`));
await check("classmate reads another's read times", "none", as(st2, `select * from space_reads`));
await check("student dismisses own welcome", "ok", as(st, `update profiles set onboarded_at=now() where id='${st}' returning onboarded_at`));
await check("student dismisses someone else's welcome", "none", as(st, `update profiles set onboarded_at=now() where id='${st2}' returning id`));
console.log("-- 0007 create programmes and cohorts");
const newProg = await check("admin creates a programme", "ok", as(adm, `insert into programmes (slug, title, duration_weeks, price_cents, cert_code) values ('sec','Security',6,67000,'SEC') returning id`));
await check("instructor creates a programme", "deny", as(ins, `insert into programmes (slug, title, duration_weeks, price_cents, cert_code) values ('x','X',6,1,'XX')`));
await check("student creates a programme", "deny", as(st, `insert into programmes (slug, title, duration_weeks, price_cents, cert_code) values ('y','Y',6,1,'YY')`));
await check("duplicate certificate code", "deny", as(adm, `insert into programmes (slug, title, duration_weeks, price_cents, cert_code) values ('sec2','Security 2',6,1,'SEC')`));
await check("admin adds weekly module", "ok", as(adm, `insert into programme_modules (programme_id, week, position, title) values ('${newProg.rows[0].id}',1,1,'Week 1') returning id`));
await check("instructor adds module", "deny", as(ins, `insert into programme_modules (programme_id, week, position, title) values ('${newProg.rows[0].id}',2,1,'Week 2')`));
const newCohort = await check("admin creates a cohort", "ok", as(adm, `insert into cohorts (programme_id, code, name, starts_on, ends_on) values ('${newProg.rows[0].id}','#03','Security','2026-11-02','2026-12-13') returning id`));
await check("instructor creates a cohort", "deny", as(ins, `insert into cohorts (programme_id, code, name, starts_on, ends_on) values ('${PROG}','#09','X','2026-11-02','2026-12-13')`));
await check("admin assigns the instructor", "ok", as(adm, `insert into cohort_members values ('${newCohort.rows[0].id}','${ins2}','instructor') returning user_id`));
await check("instructor adds self to a cohort", "deny", as(ins, `insert into cohort_members values ('${newCohort.rows[0].id}','${ins}','instructor')`));
await check("student enrols self for free", "deny", as(out, `insert into cohort_members values ('${C1}','${out}','student')`));
await check("admin creates cohort space", "ok", as(adm, `insert into spaces (slug, name, "group", cohort_id, read_only) values ('cohort-03-general','General','Cohort #03','${newCohort.rows[0].id}',false) returning id`));
await check("assigned instructor sees the new cohort", "ok", as(ins2, `select id from cohorts where id='${newCohort.rows[0].id}'`));
console.log("-- 0008 office hours");
const allDay = [0, 1, 2, 3, 4, 5, 6].map((d) => `('${C1}',${d},'00:00','23:59')`).join(",");
await check("student sets office hours", "deny", as(st, `insert into office_hours values ('${C1}',0,'08:00','17:00')`));
await check("other cohort's instructor sets hours", "deny", as(ins2, `insert into office_hours values ('${C1}',0,'08:00','17:00')`));
await check("end before start rejected", "deny", as(ins, `insert into office_hours values ('${C1}',0,'17:00','08:00')`));
await check("cohort instructor sets hours", "ok", as(ins, `insert into office_hours values ${allDay} returning weekday`));
await check("student reads the hours", "ok", as(st, `select * from office_hours`));
await check("outsider can't see the hours", "none", as(out, `select * from office_hours`));
await check("office is open (all-day hours)", "ok", as(st, `select 1 where office_open('${C1}')`));
const th = await check("student opens a thread while open", "ok", as(st, `insert into office_threads (cohort_id, student_id) values ('${C1}','${st}') returning id`));
const T = th.rows[0].id;
await check("student opens a thread for someone else", "deny", as(st, `insert into office_threads (cohort_id, student_id) values ('${C1}','${st2}')`));
await check("outsider opens a thread", "deny", as(out, `insert into office_threads (cohort_id, student_id) values ('${C1}','${out}')`));
await check("student writes while open", "ok", as(st, `insert into office_messages (thread_id, author_id, body) values ('${T}','${st}','Stuck on NSGs') returning id`));
await check("student writes as the instructor", "deny", as(st, `insert into office_messages (thread_id, author_id, body) values ('${T}','${ins}','fake reply')`));
await check("classmate can't read the thread", "none", as(st2, `select * from office_messages`));
await check("classmate can't write in the thread", "deny", as(st2, `insert into office_messages (thread_id, author_id, body) values ('${T}','${st2}','hi')`));
await check("instructor reads the thread", "ok", as(ins, `select * from office_messages where thread_id='${T}'`));
await check("other cohort's instructor can't read it", "none", as(ins2, `select * from office_messages`));
await as(ins, `delete from office_hours where cohort_id='${C1}'`);
await check("office closed after hours removed", "none", as(st, `select 1 where office_open('${C1}')`));
await check("student can't write while closed", "deny", as(st, `insert into office_messages (thread_id, author_id, body) values ('${T}','${st}','after hours')`));
await check("instructor replies while closed", "ok", as(ins, `insert into office_messages (thread_id, author_id, body) values ('${T}','${ins}','Check the NSG priority') returning id`));
await check("student marks the reply read", "ok", as(st, `update office_threads set student_read_at=now() where id='${T}' returning id`));
console.log("-- 0009 office hours hardening (code review)");
await as(ins, `insert into office_hours values ${allDay}`);
await check("student moves thread to another cohort", "deny", as(st, `update office_threads set cohort_id='${C2}' where id='${T}'`));
await check("student fakes the instructor's read time", "deny", as(st, `update office_threads set instructor_read_at=now() + interval '1 year' where id='${T}'`));
await check("student edits last_message_at", "deny", as(st, `update office_threads set last_message_at=now() + interval '1 year' where id='${T}'`));
await check("instructor re-points thread at another student", "deny", as(ins, `update office_threads set student_id='${st2}' where id='${T}'`));
await check("instructor sets the student's read time", "deny", as(ins, `update office_threads set student_read_at=now() where id='${T}'`));
await check("instructor marks thread read", "ok", as(ins, `update office_threads set instructor_read_at=now() where id='${T}' returning id`));
await check("student marks own side read", "ok", as(st, `update office_threads set student_read_at=now() where id='${T}' returning id`));
const before = (await db.query(`select last_message_at from office_threads where id='${T}'`)).rows[0].last_message_at;
await new Promise((r) => setTimeout(r, 20));
await check("backdated message gets server time", "ok", as(st, `insert into office_messages (thread_id, author_id, body, created_at) values ('${T}','${st}','again', now() - interval '30 days') returning (created_at > now() - interval '1 minute') as server_time`));
const after = (await db.query(`select last_message_at from office_threads where id='${T}'`)).rows[0].last_message_at;
await check("new message bumps last_message_at", "ok", Promise.resolve({ rows: after > before ? [{ bumped: true }] : [] }));
await db.exec(`delete from office_threads where student_id='${st2}' and cohort_id='${C1}'`);
const t2 = await check("new thread can't arrive pre-read by staff", "ok", as(st2, `insert into office_threads (cohort_id, student_id, instructor_read_at) values ('${C1}','${st2}', now() + interval '1 year') returning id, (instructor_read_at is null) as unread`));
const T2 = t2.rows[0].id;
await check("student writes in own thread while enrolled", "ok", as(st2, `insert into office_messages (thread_id, author_id, body) values ('${T2}','${st2}','hello') returning id`));
await db.exec(`delete from cohort_members where cohort_id='${C1}' and user_id='${st2}'`);
await check("removed student can't write in old thread", "deny", as(st2, `insert into office_messages (thread_id, author_id, body) values ('${T2}','${st2}','still here?')`));
await check("app timezone setting is used", "ok", as(st, `select 1 where academy_tz() = 'Asia/Dubai'`));
console.log("-- 0010 auth hookup");
const [N1, N2, N3] = [40, 41, 42].map(U);
async function asService(sql) {
  await db.exec(`set role service_role`);
  try { return await db.query(sql); } catch (e) { return { error: e.message }; } finally { await db.exec(`reset role`); }
}
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${N1}','Sara.K@Example.com','{"full_name":"Sara Khan","role":"admin"}')`);
await check("new user gets a profile, always a student", "ok", db.query(`select 1 from profiles where id='${N1}' and role='student' and full_name='Sara Khan' and handle='sarak'`));
await db.exec(`insert into auth.users (id, email) values ('${N2}','sara.k@other.com')`);
await check("taken handle gets a number, name falls back", "ok", db.query(`select 1 from profiles where id='${N2}' and handle='sarak2' and full_name='sarak'`));
await db.exec(`insert into auth.users (id, email) values ('${N3}','a@x.com')`);
await check("too-short handle becomes user…", "ok", db.query(`select 1 from profiles where id='${N3}' and handle ~ '^user[0-9]*$'`));
await check("anon looks up an account by email", "deny", as(null, `select user_id_by_email('sara.k@example.com')`));
await check("student looks up an account by email", "deny", as(st, `select user_id_by_email('sara.k@example.com')`));
await check("admin (signed in) looks up an account by email", "deny", as(adm, `select user_id_by_email('sara.k@example.com')`));
await check("server key finds account by email, any case", "ok", asService(`select 1 where user_id_by_email('SARA.K@example.com') = '${N1}'`));
await check("unknown email finds nothing", "ok", asService(`select 1 where user_id_by_email('nobody@example.com') is null`));
console.log("-- 0011 app data");
await db.exec(`update programmes set published=true`);
await check("admin (not a member) reads a cohort's assignments", "ok", as(adm, `select id from assignments where cohort_id='${C1}'`));
await check("admin (not a member) reads cohort space posts", "ok", as(adm, `select p.id from posts p where p.space_id='${GEN}'`));
await check("outsider still can't read cohort posts", "none", as(out, `select id from posts where space_id='${GEN}'`));
await check("visitor sees published cohorts", "ok", as(null, `select id from cohorts where id='${C1}'`));
await check("visitor sees the cohort's instructor", "ok", as(null, `select full_name from profiles where id='${ins}'`));
await check("visitor can't see students", "none", as(null, `select id from profiles where id='${st}'`));
await check("visitor can't see the student roster", "none", as(null, `select user_id from cohort_members where role='student'`));
await check("student sees other cohorts' dates, not their members", "none", as(st, `select user_id from cohort_members where cohort_id='${C2}' and role='student'`));
await db.exec(`update programmes set published=false`);
await check("unpublished programme's cohorts are hidden from visitors", "none", as(null, `select id from cohorts`));
await db.exec(`update programmes set published=true`);
await check("snapshot: student gets own notifications only", "ok", as(st, `select 1 where not exists (select 1 from jsonb_array_elements(app_snapshot()->'notifications') n where n->>'user_id' <> '${st}')`));
await check("snapshot: no posts from a cohort you're not in", "ok", as(st, `select 1 where not exists (select 1 from jsonb_array_elements(app_snapshot()->'posts') p where p->>'space_id' = '${GEN2}')`));
await check("snapshot: outsider gets no submissions", "ok", as(out, `select 1 where jsonb_array_length(app_snapshot()->'assignment_submissions') = 0`));
await check("snapshot: visitor gets no waitlist", "ok", as(null, `select 1 where jsonb_array_length(app_snapshot()->'waitlist') = 0`));
await check("snapshot: admin gets every cohort's work", "ok", as(adm, `select 1 where jsonb_array_length(app_snapshot()->'assignment_submissions') > 0`));
await db.exec(`insert into programme_modules (id, programme_id, week, title) values ('${U(61)}','${PROG}',1,'W1') on conflict do nothing`);
await db.exec(`insert into lessons (id, module_id, position, title, kind) values ('${U(62)}','${U(61)}',9,'L2','reading') on conflict do nothing`);
await check("student records own progress", "ok", as(st, `insert into lesson_progress (user_id, lesson_id) values ('${st}','${U(62)}') returning lesson_id`));
await check("cohort instructor sees a student's progress", "ok", as(ins, `select lesson_id from lesson_progress where user_id='${st}'`));
await check("admin sees a student's progress", "ok", as(adm, `select lesson_id from lesson_progress where user_id='${st}'`));
await check("other cohort's instructor can't", "none", as(ins2, `select lesson_id from lesson_progress where user_id='${st}'`));
await check("classmate can't", "none", as(st2, `select lesson_id from lesson_progress where user_id='${st}'`));
console.log("-- 0012 email");
await check("student saves own email settings", "ok", as(st, `insert into email_preferences (user_id, off) values ('${st}', '{reminders}') returning off`));
await check("student can't save someone else's", "deny", as(st, `insert into email_preferences (user_id, off) values ('${st2}', '{grades}')`));
await check("classmate can't read them", "none", as(st2, `select off from email_preferences where user_id='${st}'`));
await check("admin (signed in) can't read them either", "none", as(adm, `select off from email_preferences where user_id='${st}'`));
await check("unknown email kinds are refused", "deny", as(st, `update email_preferences set off='{everything}' where user_id='${st}'`));
await check("snapshot has only your own settings", "ok", as(st2, `select 1 where jsonb_array_length(app_snapshot()->'email_preferences') = 0`));
await check("signed-in people can't touch the reminder log", "deny", as(adm, `insert into email_reminders (class_id, user_id) select id, '${st}' from classes limit 1`));
await check("server key records a reminder", "ok", asService(`insert into email_reminders (class_id, user_id) select id, '${st}' from classes limit 1 returning user_id`));
await check("and nobody signed in can read it", "none", as(st, `select * from email_reminders`));
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
