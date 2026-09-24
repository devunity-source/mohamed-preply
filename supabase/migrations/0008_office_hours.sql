-- 0008: office hours. Each cohort has weekly windows (UAE time) when its
-- students can message the cohort's instructors. Instructors reply any time.

create table office_hours (
  cohort_id uuid not null references cohorts (id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6), -- 0 = Monday
  starts_at time not null,
  ends_at   time not null check (ends_at > starts_at),
  primary key (cohort_id, weekday)
);

create table office_threads (
  id                 uuid primary key default gen_random_uuid(),
  cohort_id          uuid not null references cohorts (id) on delete cascade,
  student_id         uuid not null references profiles (id) on delete cascade,
  created_at         timestamptz not null default now(),
  last_message_at    timestamptz not null default now(),
  instructor_read_at timestamptz,
  student_read_at    timestamptz,
  unique (cohort_id, student_id)
);

create table office_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references office_threads (id) on delete cascade,
  author_id  uuid not null references profiles (id),
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table office_hours    enable row level security;
alter table office_threads  enable row level security;
alter table office_messages enable row level security;

-- Is the cohort's office open right now? Evaluated in the academy timezone,
-- which must match ACADEMY_TIMEZONE in the app (default Asia/Dubai).
create function office_open(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from office_hours h, (select now() at time zone 'Asia/Dubai' as t) local
    where h.cohort_id = c
      and h.weekday = extract(isodow from local.t)::int - 1
      and local.t::time >= h.starts_at
      and local.t::time <  h.ends_at
  );
$$;

create function is_cohort_student(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cohort_members where cohort_id = c and user_id = auth.uid() and role = 'student');
$$;

-- Who can see a thread: its student, or the cohort's staff.
create function can_see_office_thread(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from office_threads th where th.id = t and (th.student_id = auth.uid() or teaches(th.cohort_id))
  );
$$;

create function office_thread_student_open(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from office_threads th where th.id = t and th.student_id = auth.uid() and office_open(th.cohort_id)
  );
$$;

create function office_thread_staff(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from office_threads th where th.id = t and teaches(th.cohort_id));
$$;

grant execute on function office_open(uuid) to authenticated;

-- Hours: the cohort sees them; its instructors (and admins) set them.
create policy "office hours read" on office_hours for select to authenticated
  using (in_cohort(cohort_id) or teaches(cohort_id));
create policy "office hours write" on office_hours for all to authenticated
  using (teaches(cohort_id)) with check (teaches(cohort_id));

-- Threads: private to the student and the cohort's staff. A student opens
-- their own thread, only in their cohort and only while the office is open.
create policy "office threads read" on office_threads for select to authenticated
  using (student_id = auth.uid() or teaches(cohort_id));
create policy "office threads open" on office_threads for insert to authenticated
  with check (student_id = auth.uid() and is_cohort_student(cohort_id) and office_open(cohort_id));
create policy "office threads mark read" on office_threads for update to authenticated
  using (student_id = auth.uid() or teaches(cohort_id))
  with check (student_id = auth.uid() or teaches(cohort_id));

-- Messages: students write in their own thread while open; staff reply any time.
create policy "office messages read" on office_messages for select to authenticated
  using (can_see_office_thread(thread_id));
create policy "office messages write" on office_messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and (office_thread_student_open(thread_id) or office_thread_staff(thread_id))
  );
