-- 0012: email.
--
-- email_preferences: which kinds of email someone turned off. Only they can
-- read or change their row (not part of the profile, which everyone reads).
-- The server changes it with the secret key when someone uses an
-- unsubscribe link without signing in.
--
-- email_reminders: class reminders already sent, so the reminder job sends
-- each one once. Only the server (secret key) touches it.

create table email_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  off     text[] not null default '{}'
          check (off <@ array['grades', 'community', 'office_hours', 'reminders']::text[])
);
alter table email_preferences enable row level security;
create policy "email preferences own" on email_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table email_reminders (
  class_id uuid not null references classes (id) on delete cascade,
  user_id  uuid not null references profiles (id) on delete cascade,
  sent_at  timestamptz not null default now(),
  primary key (class_id, user_id)
);
alter table email_reminders enable row level security;
-- No policies: signed-in people and visitors can't read or write it.

create or replace function app_snapshot() returns jsonb
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
    'office_messages',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from office_messages t),
    'email_preferences',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from email_preferences t),
    'email_reminders',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from email_reminders t)
  );
$$;
