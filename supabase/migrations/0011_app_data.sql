-- 0011: the app reads its data from Supabase.
--
-- 1. app_snapshot(): everything the caller may read, as one JSON value, in a
--    single round trip. It runs as the caller (security invoker), so row level
--    security decides what goes in; the app never sees rows it couldn't query
--    itself.
-- 2. Admins read every cohort's classes, labs, work and spaces (the admin
--    area and moderation need them; they could already write them).
-- 3. A public catalogue for visitors: the landing page shows each published
--    programme's cohorts and instructor. Students stay private.

-- 2. Admins count as members of every cohort. in_cohort() gates reads across
-- the schema; admins already pass teaches() for writes.
create or replace function in_cohort(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cohort_members where cohort_id = c and user_id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- 3. Public catalogue.
create function is_published_cohort(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cohorts co join programmes p on p.id = co.programme_id where co.id = c and p.published);
$$;

create function teaches_published_cohort(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohort_members m
    where m.user_id = u and m.role = 'instructor' and is_published_cohort(m.cohort_id)
  );
$$;

create policy "cohorts public" on cohorts for select to anon, authenticated
  using (is_published_cohort(id));

create policy "instructors public" on cohort_members for select to anon, authenticated
  using (role = 'instructor' and is_published_cohort(cohort_id));

create policy "instructor profiles public" on profiles for select to anon
  using (teaches_published_cohort(id));

-- 1. The snapshot. Tables the app doesn't use yet (payments, enrollments) are
-- left out.
create function app_snapshot() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'profiles',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from profiles t),
    'programmes',            (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from programmes t),
    'programme_modules',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from programme_modules t),
    'lessons',               (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from lessons t),
    'cohorts',               (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from cohorts t),
    'cohort_members',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from cohort_members t),
    'classes',               (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from classes t),
    'class_attendance',      (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from class_attendance t),
    'labs',                  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from labs t),
    'lab_attempts',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from lab_attempts t),
    'assignments',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from assignments t),
    'assignment_resources',  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from assignment_resources t),
    'assignment_submissions',(select coalesce(jsonb_agg(to_jsonb(t)), '[]') from assignment_submissions t),
    'grades',                (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from grades t),
    'resources',             (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from resources t),
    'events',                (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from events t),
    'spaces',                (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from spaces t),
    'posts',                 (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from posts t),
    'comments',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from comments t),
    'reactions',             (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from reactions t),
    'notifications',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from notifications t),
    'lesson_progress',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from lesson_progress t),
    'waitlist',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from waitlist t),
    'projects',              (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from projects t),
    'project_members',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from project_members t),
    'project_milestones',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from project_milestones t),
    'certificates',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from certificates t),
    'space_reads',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from space_reads t),
    'office_hours',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from office_hours t),
    'office_threads',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from office_threads t),
    'office_messages',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from office_messages t)
  );
$$;

revoke all on function app_snapshot() from public;
grant execute on function app_snapshot() to anon, authenticated;

-- Instructors link resources to their cohort's assignments (it had a read
-- rule only).
create policy "assignment resources write" on assignment_resources for all to authenticated
  using (exists (select 1 from assignments a where a.id = assignment_id and teaches(a.cohort_id)))
  with check (exists (select 1 from assignments a where a.id = assignment_id and teaches(a.cohort_id)));

-- Cohort staff see their students' lesson progress (it was own-rows only, so
-- the cohort dashboard, at-risk list and certificate eligibility read 0%).
create policy "progress staff read" on lesson_progress for select to authenticated
  using (exists (
    select 1 from cohort_members m
    where m.user_id = lesson_progress.user_id and m.role = 'student' and teaches(m.cohort_id)
  ));
