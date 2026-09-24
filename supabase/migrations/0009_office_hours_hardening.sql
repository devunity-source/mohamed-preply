-- 0009: office hours hardening (code review of 0008).
--
-- 1. The "mark read" update policy let either side rewrite any column: a
--    student could move their thread to another cohort's inbox or fake the
--    instructor's read time; an instructor could re-point a thread at another
--    student. Now only the two read times are updatable at all, each side can
--    only set its own, and last_message_at is maintained by the database.
-- 2. A student removed from a cohort could keep writing in their old thread.
-- 3. The timezone was hard-coded; it now comes from a database setting.

-- Timezone ----------------------------------------------------------------

-- Must match ACADEMY_TIMEZONE in the app. Set it with:
--   alter database postgres set app.academy_timezone = 'Asia/Dubai';
create function academy_tz() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('app.academy_timezone', true), ''), 'Asia/Dubai');
$$;

create or replace function office_open(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from office_hours h, (select now() at time zone academy_tz() as t) local
    where h.cohort_id = c
      and h.weekday = extract(isodow from local.t)::int - 1
      and local.t::time >= h.starts_at
      and local.t::time <  h.ends_at
  );
$$;

-- Removed students --------------------------------------------------------

create or replace function office_thread_student_open(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from office_threads th
    where th.id = t
      and th.student_id = auth.uid()
      and is_cohort_student(th.cohort_id)
      and office_open(th.cohort_id)
  );
$$;

-- Threads: only read times are writable, each side its own ------------------

revoke update on office_threads from authenticated, anon;
grant update (student_read_at, instructor_read_at) on office_threads to authenticated;

create function office_threads_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- New threads start now and unread by staff, whatever the client sent.
    new.created_at := now();
    new.last_message_at := now();
    new.instructor_read_at := null;
    return new;
  end if;
  if new.student_read_at is distinct from old.student_read_at and old.student_id is distinct from auth.uid() then
    raise exception 'only the student can mark their side of the thread read';
  end if;
  if new.instructor_read_at is distinct from old.instructor_read_at and not teaches(old.cohort_id) then
    raise exception 'only the cohort''s staff can mark the thread read for staff';
  end if;
  return new;
end;
$$;

create trigger office_threads_guard before insert or update on office_threads
  for each row execute function office_threads_guard();

-- Messages: server time, and they bump the thread ---------------------------

create function office_messages_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger office_messages_stamp before insert on office_messages
  for each row execute function office_messages_stamp();

-- Runs as the table owner, so it can set last_message_at, which clients can't.
create function office_messages_bump() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update office_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger office_messages_bump after insert on office_messages
  for each row execute function office_messages_bump();
