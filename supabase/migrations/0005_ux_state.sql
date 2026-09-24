-- 0005: small bits of per-user UI state that should survive devices.

-- First-visit welcome on the dashboard. Set once when dismissed.
-- The existing "profiles update" policy already limits updates to your own row
-- (and pins role), so no new policy is needed.
alter table profiles add column onboarded_at timestamptz;

-- When each person last opened each community space. Drives unread counts.
create table space_reads (
  user_id      uuid not null references profiles (id) on delete cascade,
  space_id     uuid not null references spaces (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, space_id)
);
alter table space_reads enable row level security;

-- Private to each person, and only for spaces they can see (a read row for a
-- hidden space would leak that it exists).
create policy "space_reads own" on space_reads for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and can_see_space(space_id));
