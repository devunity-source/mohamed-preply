# Connecting Supabase

With Supabase connected, everything lives in your project: accounts and sign-in, programmes and lessons, cohorts, community, grades, office hours, the waitlist. Without the Supabase keys the app runs in demo mode (in-memory data), which is what local development and the automated tests use by default.

## Already did step 1 (sign-in)?

Four things, about 5 minutes:

1. Add `SUPABASE_SECRET_KEY` to `.env.local`. It's required now: the server uses it to send notifications and invites.
2. `npm run db:bundle -- 0011`, paste `supabase/all-migrations.sql` into **SQL Editor**, press **Run**. (That's 0011 to 0013 together.)
3. `npm run db:seed` to load the curriculum. Run it again after 0013 if you seeded earlier: it adds the Arabic versions to rows that don't have any yet, and leaves everything else alone.
4. `npm run db:check` to confirm everything is in place.

The rest of this page is the full setup for a new project.

---

Takes about 20 minutes. The linked dashboard pages were checked against Supabase's docs on 24 Sep 2026. The other menu names (API Keys, Sign In / Providers, Users) weren't, and Supabase renames things now and then, so look nearby if one has moved.

## 1. Environment variables

In `.env.local` on your machine (never committed; `.env*` is git-ignored), and in your hosting provider's secret settings when you deploy:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Server only. Never share it or paste it anywhere public.
SUPABASE_SECRET_KEY=sb_secret_...
# The address people use to reach the app. Links in emails point here.
SITE_URL=http://localhost:3000
```

Both keys are under **Project Settings > API Keys**. The publishable key is safe in a browser. The secret key bypasses every security rule in the database; the app only uses it on the server, for notifications and invites, after its own permission checks.

## 2. Create the tables

```bash
npm run db:bundle
```

This writes `supabase/all-migrations.sql` (every migration in one transaction). Open **SQL Editor**, paste the whole file, press **Run**. If anything fails, nothing is applied, so you can fix it and run it again.

Then set the database's timezone to match the app:

```sql
alter database postgres set app.academy_timezone = 'Asia/Dubai';
```

## 3. Load the curriculum

```bash
npm run db:seed
```

Adds the DevOps and AI Engineering programmes (published, with their prices), their weekly modules and lessons, and the campus-wide community spaces (General, Career, DevOps, Student Projects). No people, cohorts, posts or grades. Running it again only adds what's missing; it never overwrites your edits.

## 4. Links in emails

[URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration):

- **Site URL**: the same value as `SITE_URL` (for now `http://localhost:3000`, later your real domain).
- **Redirect URLs**: add `http://localhost:3000/**` and, when you deploy, `https://<your-domain>/**`.

[Email Templates](https://supabase.com/dashboard/project/_/auth/templates): replace two templates with the files in `supabase/templates/` (the automated tests use the same files). Each is Arabic first, then English, since someone being invited hasn't chosen a language yet:

- **Invite user**: paste `supabase/templates/invite.html`; subject `دعوة إلى AcadeMe | You're invited to AcadeMe`
- **Reset password**: paste `supabase/templates/recovery.html`; subject `إعادة تعيين كلمة المرور | Reset your AcadeMe password`

The part that matters is the link, which goes through the app's own confirm page:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=%2Fset-password%3Fwelcome%3D1">…</a>
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=%2Fset-password">…</a>
```

Why: the default links only work in the browser that asked for them, and invites never can. These open a page with a **Continue** button, so mail scanners that open links in advance don't use them up.

## 5. Email sending

Supabase's built-in email sends **2 emails an hour, only to members of your Supabase team**. Fine for trying invites on yourself; not for students. Before inviting real people, send it through Resend: [`docs/email-setup.md`](email-setup.md), step 4.

## 6. Who can create an account

AcadeMe is invite-only. In **Authentication > Sign In / Providers**, turn off **Allow new users to sign up**. Admin invites keep working with it off (the automated tests run that way).

## 7. Make yourself admin

1. **Authentication > Users > Add user > Send invitation**, with your email. Accept it and choose a password.
2. In SQL Editor:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Use `'instructor'` instead of `'admin'` for instructors. Nobody can change their own role from the app.

## 8. Check and try it

```bash
npm run db:check   # read-only: migrations, curriculum, admin, permissions
npm run dev
```

Then, as admin: create a cohort (Admin > New cohort), add a student by email (they get an invite), and sign in as them in a private window.

## How the app reads and writes

Each request loads everything the signed-in person may see in one call (`app_snapshot()`); the database's row level security decides what's in it, so a page can never show more than that person could query themselves. Writes run as that person too, so the same rules check every change a second time after the app's own checks. Notifications to other people and invites use the secret key, because nobody may create those directly.

This is simple and fast for an academy of a few hundred students. Past a few thousand, the busiest pages should switch to targeted queries; `src/lib/data/` is the only place that would change.
