-- 0010: Supabase Auth hookup.
--
-- Every new auth user (invited by an admin, or through a password reset of
-- an account created in the dashboard) gets a profile automatically. The role
-- is always 'student': nothing a person sends at sign-up, such as metadata,
-- can make them staff. Promote staff with SQL (see README).

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 24);
  candidate text;
  n int := 1;
begin
  if length(base) < 2 then
    base := 'user';
  end if;
  candidate := base;
  while exists (select 1 from profiles where handle = candidate) loop
    n := n + 1;
    candidate := base || n;
  end loop;
  insert into profiles (id, full_name, handle)
  values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 100), ''), base), candidate);
  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the server find an existing account by email when an admin adds a
-- student to a cohort. Only the service role (the server's secret key) may
-- call it; signed-in users and visitors can't use it to look people up.
create function public.user_id_by_email(lookup text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(lookup) limit 1
$$;

revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
