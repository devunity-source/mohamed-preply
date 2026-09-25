-- 0007: admins create programmes and cohorts from the app.
-- Programmes, modules and cohort spaces were already admin-writable (0002).
-- Cohorts and their instructor memberships had no write policy at all, so
-- only the service role could create them.

create policy "admin write cohorts" on cohorts for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "admin write members" on cohort_members for all to authenticated
  using (is_admin()) with check (is_admin());

-- The certificate code is part of every certificate ID, so two programmes
-- can never share one.
create unique index programmes_cert_code_key on programmes (cert_code);
