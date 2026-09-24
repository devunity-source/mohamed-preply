# Connecting Supabase

Step 1 of moving AcadeMe onto Supabase: **real sign-in**. Accounts, passwords, password resets and student invites run on Supabase Auth. Everything else (programmes, cohorts, posts, grades) still uses the demo data in memory until step 2.

Takes about 20 minutes. The linked dashboard pages were checked against Supabase's docs on 24 Sep 2026. The other menu names (API Keys, Sign In / Providers, Users) weren't, and Supabase renames things now and then, so look nearby if one has moved.

## 1. Environment variables

In `.env.local` on your machine (never committed; `.env*` is git-ignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Server only. Needed for admins to invite students. Never share it or paste it anywhere public.
SUPABASE_SECRET_KEY=sb_secret_...
# The address people use to reach the app. Links in emails point here.
SITE_URL=http://localhost:3000
```

Both keys are under **Project Settings > API Keys**. The publishable key is safe in the browser. The secret key bypasses every security rule in the database: keep it on the server, and in a hosting provider's secret settings for production.

With the two `NEXT_PUBLIC_` values set, the app switches from demo sign-in to Supabase. Remove them and it's back to demo mode. The automated tests always run in demo mode.

## 2. Create the tables

```bash
npm run db:bundle
```

This writes `supabase/all-migrations.sql` (all 10 migrations in one transaction). Open **SQL Editor** in the dashboard, paste the whole file, press **Run**. If anything fails, nothing is applied, so you can fix it and run it again.

Then, in the same editor, set the database's timezone to match the app:

```sql
alter database postgres set app.academy_timezone = 'Asia/Dubai';
```

## 3. Links in emails

[URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration):

- **Site URL**: the same value as `SITE_URL` (for now `http://localhost:3000`, later your real domain).
- **Redirect URLs**: add `http://localhost:3000/**` and, when you deploy, `https://<your-domain>/**`.

[Email Templates](https://supabase.com/dashboard/project/_/auth/templates). Replace the link in two templates so it goes through the app's own confirm page. Keep the rest of the wording as you like.

**Invite user**:

```html
<h2>You're invited to AcadeMe</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=%2Fset-password%3Fwelcome%3D1">Accept the invite and choose a password</a></p>
```

**Reset password**:

```html
<h2>Reset your AcadeMe password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=%2Fset-password">Choose a new password</a></p>
```

Why: the default links only work in the browser that asked for them, and invites never can. These links open a page with a **Continue** button, so mail scanners that open links in advance don't use them up.

## 4. Email sending

Supabase's built-in email sends **2 emails an hour, only to members of your Supabase team**. Fine for trying invites on yourself; not for students. Before inviting real people, set up [custom SMTP](https://supabase.com/dashboard/project/_/auth/smtp). Resend works and is already planned for the app's own emails.

## 5. Who can create an account

AcadeMe is invite-only. In **Authentication > Sign In / Providers**, turn off **Allow new users to sign up**. Admin invites should keep working with it off; if an invite fails with a sign-up error, turn it back on and tell me. Anyone who signed up that way would only get an empty student account.

## 6. Make yourself admin

1. **Authentication > Users > Add user > Send invitation**, with your email. Accept it and choose a password.
2. In SQL Editor:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Use `'instructor'` instead of `'admin'` for instructors. Nobody can change their own role from the app.

## 7. Try it

```bash
npm run dev
```

- Sign in at `/login` with the account from step 6.
- Sign out, then use **Forgot your password?** on the sign-in page.
- As admin, open a cohort and add a student with a new email: they get an invite.

## What step 1 does and doesn't do yet

Works now: sign-in, sign-out, password change (signs out other devices), password reset by email, invites, profiles created automatically (always as a student), the sign-in gate on every page, and sessions that refresh themselves.

Not yet (step 2): the rest of the data is still the in-memory demo. You'll see the demo cohorts and students next to real accounts, and **cohort memberships you add are lost when the server restarts** (the accounts and profiles themselves are safe in Supabase). Google and LinkedIn sign-in come after that, once their apps are set up.
