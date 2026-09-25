-- AcadeMe core schema.
-- Mirrors src/lib/types.ts. Every table has row level security enabled;
-- the service role (webhooks, admin jobs) bypasses RLS.

-- ---------------------------------------------------------------------------
-- Enums

create type user_role        as enum ('student', 'instructor', 'admin');
create type cohort_status    as enum ('upcoming', 'active', 'completed');
create type member_role      as enum ('student', 'instructor');
create type lesson_kind      as enum ('reading', 'video', 'exercise');
create type meeting_provider as enum ('zoom', 'google_meet', 'livekit');
create type attendance_status as enum ('present', 'late', 'absent');
create type lab_status       as enum ('not_started', 'in_progress', 'submitted', 'passed');
create type resource_kind    as enum ('slides', 'recording', 'cheatsheet', 'template', 'lab');
create type event_kind       as enum ('lab', 'office_hours', 'workshop', 'event');
create type payment_status   as enum ('pending', 'succeeded', 'refunded', 'failed');

-- ---------------------------------------------------------------------------
-- People

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  handle       text not null unique check (handle ~ '^[a-z0-9_]{2,30}$'),
  role         user_role not null default 'student',
  headline     text not null default '',
  avatar_color text not null default '#ff5a1f',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Programmes and curriculum (permanent)

create table programmes (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  tagline        text not null default '',
  description    text not null default '',
  duration_weeks int  not null check (duration_weeks > 0),
  price_cents    int  not null check (price_cents >= 0),
  currency       char(3) not null default 'EUR',
  includes       text[] not null default '{}',
  stripe_price_id text,
  published      boolean not null default false
);

create table programme_modules (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade,
  week         int  not null check (week > 0),
  position     int  not null default 1,
  title        text not null,
  summary      text not null default '',
  unique (programme_id, week, position)
);

create table lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references programme_modules (id) on delete cascade,
  position     int  not null,
  title        text not null,
  kind         lesson_kind not null,
  duration_min int  not null default 0,
  body         text not null default '',
  unique (module_id, position)
);

-- ---------------------------------------------------------------------------
-- Cohorts (a group going through a programme together)

create table cohorts (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id),
  code         text not null,
  name         text not null,
  starts_on    date not null,
  ends_on      date not null check (ends_on >= starts_on),
  status       cohort_status not null default 'upcoming',
  capacity     int,
  unique (programme_id, code)
);

create table cohort_members (
  cohort_id uuid not null references cohorts (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  role      member_role not null,
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);
create index on cohort_members (user_id);

create table classes (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references cohorts (id) on delete cascade,
  module_id     uuid references programme_modules (id),
  title         text not null,
  description   text not null default '',
  starts_at     timestamptz not null,
  duration_min  int not null default 90,
  instructor_id uuid references profiles (id),
  provider      meeting_provider not null default 'zoom',
  meeting_url   text,
  recording_url text
);
create index on classes (cohort_id, starts_at);

create table class_attendance (
  class_id uuid not null references classes (id) on delete cascade,
  user_id  uuid not null references profiles (id) on delete cascade,
  status   attendance_status not null,
  primary key (class_id, user_id)
);

create table labs (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references cohorts (id) on delete cascade,
  module_id   uuid references programme_modules (id),
  number      int  not null,
  title       text not null,
  difficulty  int  not null check (difficulty between 1 and 5),
  est_minutes int  not null,
  objectives  text[] not null default '{}',
  due_at      timestamptz not null,
  unique (cohort_id, number)
);

create table lab_attempts (
  lab_id     uuid not null references labs (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  status     lab_status not null default 'not_started',
  updated_at timestamptz not null default now(),
  primary key (lab_id, user_id)
);

create table assignments (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    uuid not null references cohorts (id) on delete cascade,
  module_id    uuid references programme_modules (id),
  title        text not null,
  instructions text not null default '',
  due_at       timestamptz not null
);

create table assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  repo_url      text,
  file_path     text, -- storage object in the 'submissions' bucket
  note          text not null default '',
  submitted_at  timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create table grades (
  submission_id uuid primary key references assignment_submissions (id) on delete cascade,
  grade         int not null check (grade between 0 and 100),
  feedback      text,
  graded_by     uuid references profiles (id),
  graded_at     timestamptz not null default now()
);

create table projects (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    uuid not null references cohorts (id) on delete cascade,
  title        text not null,
  brief        text not null default '',
  repo_url     text,
  progress     int not null default 0 check (progress between 0 and 100),
  presents_at  timestamptz
);

create table project_members (
  project_id uuid not null references projects (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create table resources (
  id        uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts (id) on delete cascade, -- null = campus-wide
  module_id uuid references programme_modules (id),
  kind      resource_kind not null,
  title     text not null,
  url       text not null
);

create table assignment_resources (
  assignment_id uuid not null references assignments (id) on delete cascade,
  resource_id   uuid not null references resources (id) on delete cascade,
  primary key (assignment_id, resource_id)
);

create table events (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    uuid references cohorts (id) on delete cascade, -- null = campus-wide
  kind         event_kind not null,
  title        text not null,
  starts_at    timestamptz not null,
  duration_min int not null default 60,
  host_id      uuid references profiles (id)
);

create table lesson_progress (
  user_id      uuid not null references profiles (id) on delete cascade,
  lesson_id    uuid not null references lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- Community

create table spaces (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  "group"     text not null,
  description text not null default '',
  cohort_id   uuid references cohorts (id) on delete cascade, -- null = open to all members
  read_only   boolean not null default false
);

create table posts (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references spaces (id) on delete cascade,
  author_id  uuid not null references profiles (id),
  title      text not null check (length(title) between 1 and 140),
  body       text not null check (length(body) <= 10000),
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
create index on posts (space_id, created_at desc);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts (id) on delete cascade,
  author_id  uuid not null references profiles (id),
  body       text not null check (length(body) <= 5000),
  created_at timestamptz not null default now()
);
create index on comments (post_id, created_at);

create table reactions (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  emoji   text not null check (emoji in ('👍', '🔥', '🎉', '💡', '❤️')),
  primary key (post_id, user_id, emoji)
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  text       text not null,
  href       text not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Enrolment, payments, certificates

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references profiles (id),
  programme_id       uuid not null references programmes (id),
  stripe_session_id  text unique,
  amount_cents       int not null,
  currency           char(3) not null,
  status             payment_status not null default 'pending',
  created_at         timestamptz not null default now()
);

create table enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  programme_id uuid not null references programmes (id),
  cohort_id    uuid references cohorts (id),
  payment_id   uuid references payments (id),
  created_at   timestamptz not null default now(),
  unique (user_id, programme_id, cohort_id)
);

create table certificates (
  id           text primary key, -- e.g. AM-DEV-2026-00142
  user_id      uuid not null references profiles (id),
  cohort_id    uuid not null references cohorts (id),
  issued_at    timestamptz not null default now(),
  unique (user_id, cohort_id)
);

-- ---------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER so policies can call them without
-- recursing into cohort_members' own policies.

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('instructor', 'admin'));
$$;

create function in_cohort(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cohort_members where cohort_id = c and user_id = auth.uid());
$$;

create function teaches(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cohort_members where cohort_id = c and user_id = auth.uid() and role = 'instructor')
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function can_see_space(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from spaces where id = s and (cohort_id is null or in_cohort(cohort_id)));
$$;

-- ---------------------------------------------------------------------------
-- Row level security

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','programmes','programme_modules','lessons','cohorts','cohort_members','classes',
    'class_attendance','labs','lab_attempts','assignments','assignment_submissions','grades','projects',
    'project_members','resources','assignment_resources','events','lesson_progress','spaces','posts',
    'comments','reactions','notifications','payments','enrollments','certificates'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Profiles: any signed-in user can see names/avatars; you edit only yourself
-- (role changes go through the service role).
create policy "profiles read"   on profiles for select to authenticated using (true);
create policy "profiles update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Catalogue: public, so the marketing site can render it.
create policy "programmes read" on programmes for select using (published or is_staff());
create policy "modules read"    on programme_modules for select using (true);
create policy "lessons read"    on lessons for select to authenticated using (
  exists (select 1 from programme_modules m join cohorts c on c.programme_id = m.programme_id
          where m.id = lessons.module_id and in_cohort(c.id)) or is_staff());
create policy "staff write programmes" on programmes        for all to authenticated using (is_staff()) with check (is_staff());
create policy "staff write modules"    on programme_modules for all to authenticated using (is_staff()) with check (is_staff());
create policy "staff write lessons"    on lessons           for all to authenticated using (is_staff()) with check (is_staff());

-- Cohort-scoped content: members read, cohort instructors write.
create policy "cohorts read" on cohorts for select to authenticated using (in_cohort(id) or is_staff());
create policy "members read" on cohort_members for select to authenticated using (in_cohort(cohort_id) or is_staff());

create policy "classes read"      on classes     for select to authenticated using (in_cohort(cohort_id));
create policy "classes write"     on classes     for all    to authenticated using (teaches(cohort_id)) with check (teaches(cohort_id));
create policy "labs read"         on labs        for select to authenticated using (in_cohort(cohort_id));
create policy "labs write"        on labs        for all    to authenticated using (teaches(cohort_id)) with check (teaches(cohort_id));
create policy "assignments read"  on assignments for select to authenticated using (in_cohort(cohort_id));
create policy "assignments write" on assignments for all    to authenticated using (teaches(cohort_id)) with check (teaches(cohort_id));
create policy "projects read"     on projects    for select to authenticated using (in_cohort(cohort_id));
create policy "projects write"    on projects    for all    to authenticated using (teaches(cohort_id)) with check (teaches(cohort_id));
create policy "project members read" on project_members for select to authenticated using (
  exists (select 1 from projects p where p.id = project_id and in_cohort(p.cohort_id)));
create policy "resources read"    on resources   for select to authenticated using (cohort_id is null or in_cohort(cohort_id));
create policy "resources write"   on resources   for all    to authenticated using (is_staff()) with check (is_staff());
create policy "assignment resources read" on assignment_resources for select to authenticated using (
  exists (select 1 from assignments a where a.id = assignment_id and in_cohort(a.cohort_id)));
create policy "events read"       on events      for select to authenticated using (cohort_id is null or in_cohort(cohort_id));
create policy "events write"      on events      for all    to authenticated using (is_staff()) with check (is_staff());

create policy "attendance read" on class_attendance for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from classes c where c.id = class_id and teaches(c.cohort_id)));

-- Student work: you see and write your own; your cohort's instructors see all.
create policy "progress own" on lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lab attempts read" on lab_attempts for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from labs l where l.id = lab_id and teaches(l.cohort_id)));
create policy "lab attempts own" on lab_attempts for insert to authenticated with check (
  user_id = auth.uid() and status in ('in_progress', 'submitted')
  and exists (select 1 from labs l where l.id = lab_id and in_cohort(l.cohort_id)));
create policy "lab attempts update own" on lab_attempts for update to authenticated
  using (user_id = auth.uid() and status <> 'passed')
  with check (user_id = auth.uid() and status in ('in_progress', 'submitted'));
create policy "lab attempts grade" on lab_attempts for update to authenticated using (
  exists (select 1 from labs l where l.id = lab_id and teaches(l.cohort_id)));

create policy "submissions read" on assignment_submissions for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from assignments a where a.id = assignment_id and teaches(a.cohort_id)));
create policy "submissions insert" on assignment_submissions for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from assignments a where a.id = assignment_id and in_cohort(a.cohort_id)));
create policy "submissions update" on assignment_submissions for update to authenticated
  using (user_id = auth.uid() and not exists (select 1 from grades g where g.submission_id = assignment_submissions.id))
  with check (user_id = auth.uid());

create policy "grades read" on grades for select to authenticated using (
  exists (select 1 from assignment_submissions s join assignments a on a.id = s.assignment_id
          where s.id = submission_id and (s.user_id = auth.uid() or teaches(a.cohort_id))));
create policy "grades write" on grades for all to authenticated using (
  exists (select 1 from assignment_submissions s join assignments a on a.id = s.assignment_id
          where s.id = submission_id and teaches(a.cohort_id)))
  with check (graded_by = auth.uid());

-- Community
create policy "spaces read" on spaces for select to authenticated using (cohort_id is null or in_cohort(cohort_id));
create policy "spaces write" on spaces for all to authenticated using (is_staff()) with check (is_staff());

create policy "posts read" on posts for select to authenticated using (can_see_space(space_id));
create policy "posts insert" on posts for insert to authenticated with check (
  author_id = auth.uid() and can_see_space(space_id) and pinned = false
  and (not (select read_only from spaces where id = space_id) or is_staff()));
create policy "posts update own" on posts for update to authenticated
  using (author_id = auth.uid() or is_staff()) with check (author_id = auth.uid() or is_staff());
create policy "posts delete" on posts for delete to authenticated using (author_id = auth.uid() or is_staff());

create policy "comments read" on comments for select to authenticated using (
  exists (select 1 from posts p where p.id = post_id and can_see_space(p.space_id)));
create policy "comments insert" on comments for insert to authenticated with check (
  author_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and can_see_space(p.space_id)));
create policy "comments delete" on comments for delete to authenticated using (author_id = auth.uid() or is_staff());

create policy "reactions read" on reactions for select to authenticated using (
  exists (select 1 from posts p where p.id = post_id and can_see_space(p.space_id)));
create policy "reactions own" on reactions for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and can_see_space(p.space_id)));
create policy "reactions delete own" on reactions for delete to authenticated using (user_id = auth.uid());

-- Notifications are written by the server (service role); users read and mark their own.
create policy "notifications own read"   on notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Payments and enrolments are written only by the Stripe webhook (service role).
create policy "payments own"    on payments    for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "enrollments own" on enrollments for select to authenticated using (user_id = auth.uid() or is_staff());

-- Certificates are public so the verification URL works for anyone.
create policy "certificates public" on certificates for select using (true);
