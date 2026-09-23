-- Security hardening from the 2026-09-23 review.
--   #3 authors could move their post into a read-only space and pin it
--   #4 students controlled submitted_at (backdating) and could re-point submissions
--   #5 every instructor had catalogue-wide and cross-cohort write access
--   #7 users could rewrite the text/href of their own notifications
--   plus a 0001 bug: the submissions update policy recursed, blocking all updates
--   #10 the certificates table exposed every certified user's id publicly
--
-- Triggers skip checks when auth.uid() is null: that's the service role
-- (webhooks, seed scripts), which bypasses RLS by design.

-- ---------------------------------------------------------------------------
-- Role helpers. "Staff" is split: admins run the academy, instructors only
-- act inside cohorts they teach (teaches() already includes admins).

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function can_moderate_space(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
      or exists (select 1 from spaces where id = s and cohort_id is not null and teaches(cohort_id));
$$;

-- ---------------------------------------------------------------------------
-- #5 Catalogue: admin only.

drop policy "programmes read" on programmes;
drop policy "lessons read" on lessons;
drop policy "staff write programmes" on programmes;
drop policy "staff write modules" on programme_modules;
drop policy "staff write lessons" on lessons;

create policy "programmes read" on programmes for select using (published or is_admin());
create policy "lessons read" on lessons for select to authenticated using (
  exists (select 1 from programme_modules m join cohorts c on c.programme_id = m.programme_id
          where m.id = lessons.module_id and in_cohort(c.id)) or is_admin());
create policy "admin write programmes" on programmes        for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin write modules"    on programme_modules for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin write lessons"    on lessons           for all to authenticated using (is_admin()) with check (is_admin());

-- #5 Cohorts and rosters: members and admins only.
drop policy "cohorts read" on cohorts;
drop policy "members read" on cohort_members;
create policy "cohorts read" on cohorts for select to authenticated using (in_cohort(id) or is_admin());
create policy "members read" on cohort_members for select to authenticated using (in_cohort(cohort_id) or is_admin());

-- #5 Resources, events, spaces: campus-wide rows are admin-only, cohort rows
-- belong to that cohort's instructors.
drop policy "resources write" on resources;
drop policy "events write" on events;
drop policy "spaces write" on spaces;
create policy "resources write" on resources for all to authenticated
  using (case when cohort_id is null then is_admin() else teaches(cohort_id) end)
  with check (case when cohort_id is null then is_admin() else teaches(cohort_id) end);
create policy "events write" on events for all to authenticated
  using (case when cohort_id is null then is_admin() else teaches(cohort_id) end)
  with check (case when cohort_id is null then is_admin() else teaches(cohort_id) end);
create policy "spaces write" on spaces for all to authenticated
  using (case when cohort_id is null then is_admin() else teaches(cohort_id) end)
  with check (case when cohort_id is null then is_admin() else teaches(cohort_id) end);

-- #5 Payments and enrolments: owner or admin.
drop policy "payments own" on payments;
drop policy "enrollments own" on enrollments;
create policy "payments own"    on payments    for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "enrollments own" on enrollments for select to authenticated using (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- #3 + #5 Community: moderation is per space.

drop policy "posts insert" on posts;
drop policy "posts update own" on posts;
drop policy "posts delete" on posts;
drop policy "comments delete" on comments;

create policy "posts insert" on posts for insert to authenticated with check (
  author_id = auth.uid() and can_see_space(space_id) and pinned = false
  and (not (select read_only from spaces where id = space_id) or can_moderate_space(space_id)));
create policy "posts update" on posts for update to authenticated
  using (author_id = auth.uid() or can_moderate_space(space_id))
  with check (can_see_space(space_id));
create policy "posts delete" on posts for delete to authenticated
  using (author_id = auth.uid() or can_moderate_space(space_id));
create policy "comments delete" on comments for delete to authenticated using (
  author_id = auth.uid()
  or exists (select 1 from posts p where p.id = post_id and can_moderate_space(p.space_id)));

-- Authors may edit title and body only. Moving, pinning or re-attributing a
-- post is a moderator action, and posts never move between spaces.
create function guard_post_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.space_id <> old.space_id or new.author_id <> old.author_id or new.created_at <> old.created_at then
    raise exception 'posts cannot be moved or re-attributed';
  end if;
  if new.pinned <> old.pinned and not can_moderate_space(old.space_id) then
    raise exception 'only moderators can pin posts';
  end if;
  return new;
end $$;

create trigger posts_guard before update on posts
  for each row execute function guard_post_update();

-- ---------------------------------------------------------------------------
-- Fix from 0001: "submissions update" looked up grades, whose policy looks up
-- assignment_submissions again, which Postgres rejects as infinite recursion.
-- Students could never update a submission. Check grading without RLS instead.

create function is_graded(submission uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from grades where submission_id = submission);
$$;

drop policy "submissions update" on assignment_submissions;
create policy "submissions update" on assignment_submissions for update to authenticated
  using (user_id = auth.uid() and not is_graded(id))
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- #4 Submissions: the server clock decides submitted_at; the target
-- assignment and owner are fixed; uploads must live in the owner's folder.

create function guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  new.submitted_at := now();
  if tg_op = 'UPDATE' and (new.assignment_id <> old.assignment_id or new.user_id <> old.user_id) then
    raise exception 'submissions cannot be moved to another assignment or user';
  end if;
  if new.file_path is not null and new.file_path not like auth.uid()::text || '/%' then
    raise exception 'file_path must be inside your own folder';
  end if;
  return new;
end $$;

create trigger submissions_guard before insert or update on assignment_submissions
  for each row execute function guard_submission();

-- Lab attempts can't be re-pointed at another lab or user either.
create function guard_lab_attempt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.lab_id <> old.lab_id or new.user_id <> old.user_id then
    raise exception 'lab attempts cannot be moved';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger lab_attempts_guard before update on lab_attempts
  for each row execute function guard_lab_attempt();

-- ---------------------------------------------------------------------------
-- #7 Notifications: users may only mark them read.

revoke update on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;

-- ---------------------------------------------------------------------------
-- #10 Certificates: no public table scan. Owners and admins read rows;
-- anyone can verify one certificate by its id.

drop policy "certificates public" on certificates;
create policy "certificates own" on certificates for select to authenticated
  using (user_id = auth.uid() or is_admin());

create function verify_certificate(certificate_id text)
returns table (id text, full_name text, programme text, starts_on date, ends_on date, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, p.full_name, pr.title, co.starts_on, co.ends_on, c.issued_at
  from certificates c
  join profiles p on p.id = c.user_id
  join cohorts co on co.id = c.cohort_id
  join programmes pr on pr.id = co.programme_id
  where c.id = certificate_id;
$$;
grant execute on function verify_certificate(text) to anon, authenticated;

-- is_staff() is no longer referenced by any policy.
drop function is_staff();
