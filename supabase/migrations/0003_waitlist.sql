-- Waitlist for upcoming cohorts, filled from the public landing page.
-- Anyone (including signed-out visitors) can add themselves; only admins can
-- read the list. Nobody can update rows, and admins alone can delete.

create table waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null check (length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  programme_id uuid not null references programmes (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (email, programme_id)
);

alter table waitlist enable row level security;

create policy "waitlist join" on waitlist for insert to anon, authenticated
  with check (email = lower(email) and exists (select 1 from programmes p where p.id = programme_id and p.published));
create policy "waitlist admin read" on waitlist for select to authenticated using (is_admin());
create policy "waitlist admin delete" on waitlist for delete to authenticated using (is_admin());

-- The server stamps created_at, not the visitor.
create function stamp_waitlist() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end $$;

create trigger waitlist_stamp before insert on waitlist
  for each row execute function stamp_waitlist();
