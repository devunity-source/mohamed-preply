-- Phase 3: instructor and admin tools.
--   grading rubrics, locked threads, capstone milestones, attendance capture,
--   certificate issuing and revocation, programme certificate codes.
-- Same conventions as 0002: triggers skip checks for the service role
-- (auth.uid() is null), which bypasses RLS by design.

-- ---------------------------------------------------------------------------
-- Programmes and grading

alter table programmes add column cert_code text not null default 'GEN' check (cert_code ~ '^[A-Z]{2,5}$');

alter table assignments add column rubric jsonb not null default '[]'::jsonb
  check (jsonb_typeof(rubric) = 'array');

alter table grades add column rubric_scores jsonb check (rubric_scores is null or jsonb_typeof(rubric_scores) = 'object');

-- ---------------------------------------------------------------------------
-- Locked threads: no new replies, and only moderators lock or unlock.

alter table posts add column locked boolean not null default false;

drop policy "comments insert" on comments;
create policy "comments insert" on comments for insert to authenticated with check (
  author_id = auth.uid()
  and exists (select 1 from posts p where p.id = post_id and can_see_space(p.space_id) and not p.locked));

create or replace function guard_post_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.space_id <> old.space_id or new.author_id <> old.author_id or new.created_at <> old.created_at then
    raise exception 'posts cannot be moved or re-attributed';
  end if;
  if (new.pinned <> old.pinned or new.locked <> old.locked) and not can_moderate_space(old.space_id) then
    raise exception 'only moderators can pin or lock posts';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Attendance: cohort instructors record it.

create policy "attendance write" on class_attendance for all to authenticated
  using (exists (select 1 from classes c where c.id = class_id and teaches(c.cohort_id)))
  with check (exists (select 1 from classes c where c.id = class_id and teaches(c.cohort_id)));

-- ---------------------------------------------------------------------------
-- Capstone projects: teams, milestones. Progress is derived from milestones,
-- so the stored column goes.

alter table projects add column team_name text not null default '';
alter table projects drop column progress;

create function is_project_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = p and user_id = auth.uid());
$$;

create function project_cohort(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select cohort_id from projects where id = p;
$$;

-- Team members may update their project, but only its repository link.
create policy "projects member update" on projects for update to authenticated
  using (is_project_member(id)) with check (is_project_member(id));

create function guard_project_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or teaches(old.cohort_id) then return new; end if;
  if (new.cohort_id, new.title, new.team_name, new.brief, new.presents_at)
     is distinct from (old.cohort_id, old.title, old.team_name, old.brief, old.presents_at) then
    raise exception 'team members can only change the repository link';
  end if;
  return new;
end $$;
create trigger projects_guard before update on projects
  for each row execute function guard_project_update();

create policy "project members write" on project_members for all to authenticated
  using (teaches(project_cohort(project_id))) with check (teaches(project_cohort(project_id)));

create table project_milestones (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  position   int not null,
  title      text not null check (length(title) between 1 and 140),
  due_on     timestamptz not null,
  done_at    timestamptz,
  unique (project_id, position)
);
alter table project_milestones enable row level security;

create policy "milestones read" on project_milestones for select to authenticated
  using (in_cohort(project_cohort(project_id)) or is_admin());
create policy "milestones manage" on project_milestones for all to authenticated
  using (teaches(project_cohort(project_id))) with check (teaches(project_cohort(project_id)));
create policy "milestones tick" on project_milestones for update to authenticated
  using (is_project_member(project_id)) with check (is_project_member(project_id));

-- Team members can only tick milestones (done_at), and the server sets the time.
create function guard_milestone_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or teaches(project_cohort(old.project_id)) then return new; end if;
  if (new.project_id, new.position, new.title, new.due_on) is distinct from (old.project_id, old.position, old.title, old.due_on) then
    raise exception 'team members can only mark milestones done';
  end if;
  if new.done_at is not null and old.done_at is null then new.done_at := now(); end if;
  return new;
end $$;
create trigger milestones_guard before update on project_milestones
  for each row execute function guard_milestone_update();

-- ---------------------------------------------------------------------------
-- Certificates: admins issue and revoke; verification reports revocation.

alter table certificates add column issued_by uuid references profiles (id);
alter table certificates add column revoked_at timestamptz;

create policy "certificates admin write" on certificates for all to authenticated
  using (is_admin()) with check (is_admin());

drop function verify_certificate(text);
create function verify_certificate(certificate_id text)
returns table (id text, full_name text, programme text, starts_on date, ends_on date, issued_at timestamptz, revoked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, p.full_name, pr.title, co.starts_on, co.ends_on, c.issued_at, c.revoked_at
  from certificates c
  join profiles p on p.id = c.user_id
  join cohorts co on co.id = c.cohort_id
  join programmes pr on pr.id = co.programme_id
  where c.id = certificate_id;
$$;
grant execute on function verify_certificate(text) to anon, authenticated;
