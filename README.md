# AcadeMe

A cohort-based digital university: programmes, live classes, labs, assignments, projects and a Circle-style community, in one app.

Right now it runs entirely on seeded demo data, so you can clone it and click through everything in a couple of minutes. No database or accounts needed. Plan, decisions and progress live in [PROGRESS.md](PROGRESS.md).

---

## Quick start

You need **Node.js 20.9 or newer** (check with `node -v`) and npm, which ships with Node.

```bash
git clone https://github.com/devunity-source/mohamed-preply.git
cd mohamed-preply
npm install
npm run dev
```

Open **http://localhost:3000** for the public landing page, or **http://localhost:3000/login** to sign in. Locally the sign-in page has one-click demo accounts; pick **Ahmed Hassan** to see a student in week 4 of the DevOps Engineer cohort.

That's it. There's nothing to configure for the demo.

---

## Trying it out

**Sign in as anyone.** In local development, `/login` lists one-click demo accounts, and **Profile → Demo mode** switches between all of them. You can also sign in normally: every demo account is `<handle>@academe.demo` with password `academe-demo` (e.g. `ahmed@academe.demo`).

| Profile | What you'll see |
| --- | --- |
| Ahmed Hassan (student) | The default. Mid-programme, with open tasks and a lab in progress. |
| Rakan Matouq (admin) | Everything, including the **Admin** area: dashboards, grading, attendance, classes, projects, certificates, curriculum, waitlist. |
| Samira Aziz (instructor) | Admin area scoped to the AI Engineering cohort she teaches. Can't see DevOps or academy-wide pages. |
| Yara Saleh (graduate) | A finished student with an issued certificate. Open Programmes → the #00 cohort → Certificate to print it. |
| Any other student | Same cohort, different progress. Sarah hasn't submitted assignment #3, John submitted it late. |

**A 15-minute test run.** Each line says what should happen, so you can tell if something's off.

*As Ahmed (student):*

1. **Home.** A welcome card explains how it works. Click **Got it**; it stays gone after a reload. Your progress card shows 53% with the breakdown underneath (lessons, labs, assignments).
2. **Continue where you left off** opens lesson 2 of week 4. Read it, click **Mark done and continue**, and you land on lesson 3. Back on Home, the percentage has gone up.
3. **Press ⌘K (Mac) or Ctrl+K (Windows).** Type `pods`, press Enter, and you're on that lesson. Type `grading` and nothing comes up, because students can't see admin tools.
4. **Labs tab.** Your open lab is first; finished ones are folded under "Completed". Start and submit a lab and its status changes straight away.
5. **Assignments.** Submit a GitHub URL (try `not-a-url` first: you get an error and your text stays in the box).
6. **Community.** Spaces with new posts show an orange count. Open one: the new posts are tagged **New** and the count disappears. Topic spaces (AWS, Azure…) sit under **More spaces**. Post something that mentions `@rakan`.
7. **Calendar.** Class times are in UAE time (GMT+4).

*As Rakan (admin), via Profile → Demo mode:*

8. **Notifications** shows Ahmed's mention.
9. **Admin → the DevOps cohort → Grading → assignment #3.** One submission at a time. Enter rubric scores and feedback, press **Ctrl+Enter** (or ⌘+Enter), and it saves and opens the next ungraded one. `j` and `k` move between submissions. Try a score above the maximum: it's rejected.
10. **Attendance.** Pick a class, mark one student Absent, then **Mark remaining present**. The absent mark stays.
11. **Use the cohort dropdown** at the top to jump to the AI cohort; you stay on the same tab.
12. **Certificates** in cohort #00: issue Ines's certificate. It gets an `ACM-DEV-…` ID. Open its verify link in a private window: it works without signing in.
13. **Curriculum:** change a price and check the landing page shows it (prices are in USD).

*As Samira (instructor):* the Admin area only shows the AI Engineering cohort, and ⌘K only finds her own cohort's pages.

*Phone layout:* in Chrome, open DevTools (F12) and click the phone icon (device toolbar), then pick an iPhone. You should get a bottom bar (Home, Learn, Community, Calendar, More) and no sideways scrolling on any page.

*Signed out:* `/dashboard` sends you to `/login`, which has a **Join the waitlist** link. The landing page waitlist rejects a bad email and accepts a good one.

**Demo data resets every time the server restarts.** The seed is anchored to today's date, so the cohort is always in week 4 of 6 whenever you start it.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run typecheck` | Generate route types, then run TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, including Tailwind class ordering |
| `npm run test:db` | Database security tests (see below) |

Use a different port with `npm run dev -- -p 4000` or `npm start -- -p 4000`.

Before pushing, run: `npm run typecheck && npm run lint && npm run test:db && npm run build`.

---

## Configuration

Copy the example file and edit it if you need to:

```bash
cp .env.example .env.local
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `ACADEMY_TIMEZONE` | `Asia/Dubai` | Timezone every class time and deadline is shown in (UAE, UTC+4, no daylight saving). Any IANA name works, e.g. `Europe/London`. |
| `DEMO_PASSWORD` | `academe-demo` in dev, **unset in production** | Password for the seeded demo accounts. In production, if unset, nobody can sign in as a seeded account. |
| `DEMO_LOGIN` | on in dev, **off in production** | Set to `true` to allow one-click demo sign-in on a deployment. Only for throwaway demo instances: it lets anyone sign in as the admin. |
| `NEXT_PUBLIC_SUPABASE_URL` and the rest | unset | Phase 2 (real backend). |

`.env.local` is git-ignored. **Never commit real keys.**

---

## Database

The app doesn't talk to a database yet (that's Phase 2), but the schema is ready and tested:

```
supabase/
├── migrations/
│   ├── 0001_init.sql                 27 tables, row level security on every one
│   ├── 0002_security_hardening.sql   fixes from the security review
│   ├── 0003_waitlist.sql             landing page waitlist
│   ├── 0004_teaching_tools.sql       grading, projects, attendance, certificates
│   ├── 0005_ux_state.sql             welcome dismissal, per-space read times
│   ├── 0006_usd_and_cert_prefix.sql  USD as the default currency
│   ├── 0007_create_programmes_cohorts.sql  admins create programmes and cohorts
│   └── 0008_office_hours.sql         weekly office hours, student ↔ instructor threads
└── tests/rls.test.mjs                111 access-control checks
```

`npm run test:db` runs every migration on an in-process Postgres (PGlite), then acts as students, instructors, an admin, an outsider and an anonymous visitor to check who can read and write what. No Postgres install or Docker needed.

When the Supabase project exists, apply the migrations with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## Security

- The app sends a per-request Content Security Policy (`src/proxy.ts`) and standard security headers (`next.config.ts`).
- Every server action re-checks who's calling and what they're allowed to touch. Never trust values passed from the browser, including arguments bound with `.bind()`.
- The database enforces the same rules through row level security, covered by `npm run test:db`.
- Sign-in: scrypt-hashed passwords, random 256-bit session tokens (only their SHA-256 is stored), `__Host-` cookie that is HttpOnly, Secure and SameSite=Lax, 14-day expiry, a fresh token on every sign-in, server-side sign-out, and lockout after 5 failed attempts per email or 20 per IP in 15 minutes. Wrong password and unknown email get the same message.

> ⚠️ **Before a public deployment:** leave `DEMO_LOGIN` unset and don't set `DEMO_PASSWORD` (or set a strong one), otherwise anyone can sign in as the seeded admin. Sessions and accounts live in memory until Phase 2, so a restart signs everyone out.

Review findings and their status are tracked in [PROGRESS.md](PROGRESS.md#security).

---

## Project layout

```
src/app/(marketing)/  public landing page at /
src/app/(app)/admin/  admin and instructor tools
src/app/(app)/        app pages: dashboard, programmes, cohorts, community, calendar, resources, notifications, profile
src/components/       shared UI
src/lib/actions.ts    every write (server actions)
src/lib/data/repo.ts  every read (swap point for Supabase)
src/lib/data/seed.ts  demo data
src/proxy.ts          Content Security Policy
supabase/             schema, migrations, database tests
legacy/               previous contents of this repo
```

More detail in [PROGRESS.md → Architecture](PROGRESS.md#architecture).

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `You are using Node.js 18…` / `EBADENGINE` / odd build errors | Node is too old; you need 20.9+. With [nvm](https://github.com/nvm-sh/nvm): `nvm install --lts`, then `nvm use` in this folder (it reads `.nvmrc`). Delete `node_modules` and run `npm install` again afterwards. |
| `Port 3000 is already in use` | Stop the other process or use `npm run dev -- -p 4000`. |
| My posts and submissions disappeared | Expected. Demo data lives in memory and resets on restart. |
| Class times look an hour off | Set `ACADEMY_TIMEZONE` in `.env.local` and restart. |
| Changes to `.env.local` not showing | Restart the server; env vars are read at startup. |
