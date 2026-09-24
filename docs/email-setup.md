# Email with Resend

AcadeMe sends two kinds of email, both through Resend:

- **Sign-in emails** (invites, password resets) come from Supabase Auth. Point its SMTP settings at Resend (step 4).
- **App emails** come from the app itself, through Resend's API.

| Email | When | Who can turn it off |
| --- | --- | --- |
| Waitlist confirmation | Someone joins the waitlist (once per address and programme) | One-off |
| Welcome to a cohort | An admin adds an existing student (new ones get the invite instead) | Always sent |
| You're teaching a cohort | An admin creates a cohort with you as instructor | Always sent |
| Grades and certificates | Work graded, a lab passed or returned, a certificate issued | Profile > Email, or the link in the email |
| Mentions and comments | An @mention, or a comment on your post | Same |
| Office hours | A student's message (to instructors), a reply (to the student) | Same |
| Reminders | "Hasn't been submitted yet" nudges, and 30 to 60 minutes before each live class | Same |

Everything is also in the in-app notifications, so turning email off never hides anything. Each activity email has an unsubscribe link (it opens a page with a button, so mail scanners can't unsubscribe anyone) and the one-click unsubscribe header Gmail and Apple Mail show as their own button.

Without `RESEND_API_KEY` the app skips emails and logs them, so development needs nothing. The automated tests never send: emails go to a test outbox the tests read.

Limits checked against Resend's docs on 24 Sep 2026: the free plan sends 100 emails a day and 3,000 a month, at up to 10 requests a second. The app sends one at a time after each page has responded, so a reminder to a whole cohort never slows anyone down or hits the rate limit.

## 1. API key

1. In Resend, **API Keys > Create API key**, with **Sending access** only.
2. Add it to `.env.local` (and to your host's secret settings when you deploy):

```bash
RESEND_API_KEY=re_...
```

Never paste it into chat or commit it.

3. Check it: `npm run email:test -- you@example.com`. With the test sender (below), use the address your Resend account is registered with.

## 2. Sender address

Until you verify a domain, emails come from Resend's test sender, `onboarding@resend.dev`, which **only delivers to your own Resend account's address**. Fine for trying things; students won't receive anything.

To send to students:

1. In Resend, **Domains > Add domain**. A subdomain like `mail.yourdomain.com` keeps this separate from your normal email.
2. Add the DNS records Resend shows (SPF and DKIM; DMARC is recommended) at your DNS provider, then press **Verify**. It can take from minutes to a few hours.
3. Set the sender:

```bash
EMAIL_FROM="AcadeMe <hello@mail.yourdomain.com>"
```

4. `npm run email:test -- anyone@example.com` should now arrive anywhere.

## 3. Unsubscribe links

Links are signed with a key derived from `RESEND_API_KEY`, so nothing else to set. If you rotate the Resend key, links in emails already sent stop working; people can still use their profile settings.

## 4. Supabase sign-in emails through Resend

Supabase's built-in email sends 2 emails an hour, only to your Supabase team. In Supabase, [SMTP Settings](https://supabase.com/dashboard/project/_/auth/smtp), turn on **custom SMTP**:

| Field | Value |
| --- | --- |
| Sender email | Your verified address (`hello@mail.yourdomain.com`); the test sender only reaches you |
| Sender name | AcadeMe |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key (a separate key with sending access is fine) |

Then raise the email rate limit under **Authentication > Rate Limits** to what you need (the limit exists to stop abuse; a few dozen an hour is plenty for a cohort launch). The invite and reset templates from `docs/supabase-setup.md` step 4 stay as they are.

## 5. Class reminders (a scheduled job)

The app has an endpoint that sends reminders for classes starting within the hour: `GET /api/cron/class-reminders` with the header `Authorization: Bearer <CRON_SECRET>`. Something has to call it every 15 minutes. Each person gets each reminder once, however often it runs.

Set a long random secret (at least 24 characters) in the app's environment:

```bash
CRON_SECRET=...   # e.g. the output of: openssl rand -hex 32
```

Then pick one way to call it:

**Supabase Cron (free).** In SQL Editor, once (enable the `pg_cron` and `pg_net` extensions under Database > Extensions first):

```sql
-- Keep the secret in Vault rather than in the job itself.
select vault.create_secret('<your CRON_SECRET>', 'academe_cron_secret');

select cron.schedule(
  'academe-class-reminders',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://<your-domain>/api/cron/class-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'academe_cron_secret')
    ),
    timeout_milliseconds := 10000
  );
  $$
);
```

The `cron.schedule` and `net.http_get` calls follow Supabase's Cron docs as of 24 Sep 2026; the Vault calls (`vault.create_secret`, `vault.decrypted_secrets`) weren't rechecked that day.

**Vercel Cron.** Vercel sends `CRON_SECRET` as this header by itself. Add to `vercel.json`: `{ "crons": [{ "path": "/api/cron/class-reminders", "schedule": "*/15 * * * *" }] }`. This needs the **Pro** plan: on Hobby, jobs can only run once a day (checked 24 Sep 2026).

Without `CRON_SECRET` the endpoint answers 404 to everyone.
