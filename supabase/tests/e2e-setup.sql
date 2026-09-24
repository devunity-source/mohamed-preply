-- Browser tests only. Applied to the throwaway local Supabase that
-- scripts/e2e-supabase.sh starts; never part of the migrations, so it can't
-- reach a real project.
--
-- e2e_load(data): empties every app table and loads the given rows. Table
-- triggers are switched off while loading so the demo keeps its own
-- timestamps (in real use, triggers stamp server time on submissions and
-- office hours messages). Foreign keys stay on, so tables load parent first.

create or replace function e2e_load(data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  t text;
  cols text;
  tables text[] := array[
    'profiles', 'programmes', 'programme_modules', 'lessons', 'cohorts', 'cohort_members',
    'classes', 'class_attendance', 'labs', 'lab_attempts', 'resources', 'assignments',
    'assignment_resources', 'assignment_submissions', 'grades', 'events', 'spaces', 'posts',
    'comments', 'reactions', 'notifications', 'lesson_progress', 'waitlist', 'projects',
    'project_members', 'project_milestones', 'certificates', 'space_reads', 'office_hours',
    'office_threads', 'office_messages'
  ];
begin
  truncate profiles, programmes, programme_modules, lessons, cohorts, cohort_members, classes,
    class_attendance, labs, lab_attempts, assignments, assignment_resources, assignment_submissions,
    grades, resources, events, spaces, posts, comments, reactions, notifications, lesson_progress,
    waitlist, projects, project_members, project_milestones, certificates, space_reads, office_hours,
    office_threads, office_messages, payments, enrollments cascade;
  -- Accounts made during a test (invites) go; the demo accounts stay.
  delete from auth.users where email not like '%@academe.demo';

  foreach t in array tables loop
    continue when coalesce(jsonb_array_length(data -> t), 0) = 0;
    -- Only the columns given, so the rest get their defaults.
    select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(data -> t -> 0) k;
    execute format('alter table %I disable trigger user', t);
    execute format('insert into %I (%s) select %s from jsonb_populate_recordset(null::%I, $1)', t, cols, cols, t)
      using data -> t;
    execute format('alter table %I enable trigger user', t);
  end loop;
end $$;

revoke all on function e2e_load(jsonb) from public, anon, authenticated;
grant execute on function e2e_load(jsonb) to service_role;
