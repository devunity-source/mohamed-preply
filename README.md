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

**Things worth clicking:**

- **Admin (as Rakan):** grade assignment #3 with the rubric, pass a lab, take attendance, tick a team milestone, issue Ines's certificate in cohort #00 and open its `/verify` link, lock a thread
- **Landing page (`/`):** join the waitlist (try a bad email too), click a programme's "Join waitlist" to preselect it

- **Home:** next class, tasks, this week, progress
- **Programmes → the cohort:** tabs for schedule, modules (mark lessons done and watch progress move), classes, labs (start and submit), assignments (submit a GitHub URL)
- **Community:** post in a space, reply, react, mention someone with `@handle` (try `@rakan`, then switch to Rakan and check Notifications)
- **Calendar:** click any day for details

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
| `ACADEMY_TIMEZONE` | `Europe/Amsterdam` | Timezone every class time and deadline is shown in. Any IANA name, e.g. `Europe/London`, `Asia/Dubai`. |
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
│   └── 0005_ux_state.sql             welcome dismissal, per-space read times
└── tests/rls.test.mjs                78 access-control checks
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
| `EBADENGINE` warning or odd build errors | Upgrade Node to 20.9+ (`node -v`). |
| `Port 3000 is already in use` | Stop the other process or use `npm run dev -- -p 4000`. |
| My posts and submissions disappeared | Expected. Demo data lives in memory and resets on restart. |
| Class times look an hour off | Set `ACADEMY_TIMEZONE` in `.env.local` and restart. |
| Changes to `.env.local` not showing | Restart the server; env vars are read at startup. |
