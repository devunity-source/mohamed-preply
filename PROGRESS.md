# AcadeMe: build plan and progress

A digital university for cohort-based programmes. Circle-style community on top of a real academic structure:

```
Programme → Cohort → Modules → Classes → Labs → Assignments → Community → Projects → Certificate
```

This file is the single source of truth for what's planned, what's built, and what's next. Update the checkboxes and the log at the bottom as work lands.

---

## Status at a glance

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Foundations: repo, stack, design system, domain model, SQL schema | ✅ Done |
| 1 | Student V1 on demo data: dashboard, cohort, curriculum, classes, labs, assignments, calendar, community, resources, notifications, profile | ✅ Done |
| 2 | Real backend: Supabase auth + data, storage, Stripe enrolment, email | ⬜ Next |
| 3 | Instructor/admin area, grading, projects, certificates, attendance | ✅ Done (on demo data; Zoom API and server-side PDFs stubbed) |
| 4 | Lab environments (ephemeral Azure/AWS sandboxes) | ⬜ |
| 5 | AI layer: tutor, lab assistant, assignment feedback, student copilot | ⬜ |

---

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Brand | **AcadeMe** | Your call. |
| Location | Repo root; old scripts moved to `legacy/` | Your call. |
| Frontend | Next.js 16 (App Router, server components, server actions), React 19, Tailwind 4 | Versions current as of 23 Sep 2026 (checked on npm). |
| Backend (target) | Supabase: Postgres, Auth, Storage, Realtime, RLS | As proposed in the brief. |
| Backend (now) | In-memory demo store seeded relative to today | No accounts yet. The UI is fully usable, and every page reads through one module (`src/lib/data/repo.ts`) so Phase 2 swaps implementations without touching pages. |
| Timezone | All schedule times in UAE time (`Asia/Dubai`, UTC+4, no daylight saving), set via `ACADEMY_TIMEZONE` | Confirmed by owner, 24 Sep 2026. |
| Currency | Prices in **USD**: DevOps $670, AI Engineering $790 | Owner chose USD on 24 Sep 2026. Converted from €590 / €690 at that day's rate (1 EUR = 1.1379 USD) and rounded; owner to confirm the final numbers. |
| Certificate IDs | `ACM-<programme>-<year>-<number>`, e.g. `ACM-DEV-2026-00001` | Owner's choice, 24 Sep 2026. |
| Sign-in (target) | Email + password, Google, LinkedIn | Owner's choice, 24 Sep 2026. Google and LinkedIn arrive with Supabase Auth in Phase 2. |
| Refunds | Full refund until week 2 starts; one free move to a later cohort before week 3 | Owner's choice, 24 Sep 2026. Draft in `docs/refund-policy.md`, needs legal review before publishing. |
| Video | Zoom links for V1, LiveKit later | Brief says integrate first, build later. |
| Design (app) | Warm off-white paper, near-black ink, one signal-orange accent, square geometry. Light + dark. | Matches "bold, geometric, minimalist". |
| Design (marketing: `/`, `/login`, `/verify`) | Evening palette from the 19:00 class time: Dusk `#1F2A44`, Chalk `#F3F5F7`, Ink `#15181F`, Slate `#5B6475`, Rule `#D5DAE2`, one accent Lamp `#F2B33D`. One family, Archivo, using its width axis (wide headlines, condensed week strip). Sentence-case labels, no uppercase mono. Scoped with a `.marketing` class that redefines the tokens, so the app keeps its look. | Owner's redesign brief, 24 Sep 2026: build the page around the evening schedule. Terminal look rejected as a stock style. |
| Auth (now) | Built-in email + password: scrypt hashes, server-side sessions, `__Host-` HttpOnly cookie. One-click demo sign-in only in dev or with `DEMO_LOGIN=true`. Sign-in required for everything but `/`, `/verify` and `/login`. | Replaced the cookie-holds-a-user-id demo auth (security review #1). Phase 2 swaps it for Supabase Auth behind the same `currentUser()`. |
| Roles | `student`, `instructor` (acts only in cohorts they teach), `admin` (runs the academy). Rakan is seeded as `admin`. | Came out of the security review: "any instructor can edit everything" was too broad. |

---

## Running it

Full setup, commands, configuration and troubleshooting are in [README.md](README.md). Short version: Node 20.9+, `npm install`, `npm run dev`, open http://localhost:3000.

---

## Architecture

```
src/
├── app/
│   ├── (app)/                   authenticated shell (sidebar + mobile nav)
│   │   ├── dashboard/           student home
│   │   ├── programmes/          my cohorts + catalogue
│   │   ├── cohorts/[cohortId]/  overview, schedule, modules, classes, labs,
│   │   │                        assignments, projects, certificate
│   │   ├── community/           feed, spaces, posts, comments, reactions
│   │   ├── calendar/            month grid + day agenda
│   │   ├── resources/  notifications/  profile/
│   │   ├── admin/               admin + instructor tools (Phase 3)
│   ├── globals.css              design tokens (light + dark)
│   └── not-found.tsx
├── components/                  ui primitives, nav, forms, certificate
├── proxy.ts                     per-request Content Security Policy
└── lib/
    ├── types.ts                 domain model (mirrors SQL)
    ├── time.ts                  timezone-aware date helpers
    ├── session.ts               current user (demo cookie for now)
    ├── actions.ts               student writes (server actions, each re-checks access)
    ├── admin-actions.ts         admin/instructor writes (same rules)
    ├── authz.ts                 who may manage which cohort (mirrors SQL)
    ├── integrations/video.ts    meeting creation (Zoom API goes here)
    └── data/
        ├── seed.ts              demo data
        ├── store.ts             in-memory store
        ├── repo.ts              student read queries  ← swap point for Supabase
        └── admin.ts             admin read queries
supabase/migrations/0001_init.sql   full schema + RLS
supabase/migrations/0002_security_hardening.sql   review fixes
supabase/migrations/0003_waitlist.sql             landing page waitlist
supabase/migrations/0004_teaching_tools.sql       Phase 3: rubrics, milestones, attendance, certificates
supabase/migrations/0005_ux_state.sql             onboarded_at, space_reads (unread counts)
supabase/migrations/0006_usd_and_cert_prefix.sql  currency default USD
supabase/migrations/0007_create_programmes_cohorts.sql  admin write on cohorts + members, unique cert code
supabase/migrations/0008_office_hours.sql  office_hours, office_threads, office_messages, office_open()
supabase/migrations/0009_office_hours_hardening.sql  code review fixes for 0008
tests/e2e/                          Playwright suite (66 tests), playwright.config.ts, .github/workflows/ci.yml
docs/refund-policy.md               refund policy draft (needs legal review)
supabase/tests/rls.test.mjs         124 RLS checks on PGlite (npm run test:db)
legacy/                             previous repo contents, untouched
```

**Access rules** live in two places that must stay in sync: server actions/`repo.ts` (demo mode) and RLS policies (Supabase). Rules today:

- You see a cohort, its classes, labs, assignments, resources and spaces only if you're a member (admins see all).
- Students write only their own progress, lab attempts, submissions, posts, comments and reactions.
- Students can't post in read-only spaces, can't mark labs as passed, can't edit graded submissions, can't change their own role.
- Authors edit only a post's title and body. Moving or pinning posts is for moderators.
- The server clock sets submission times; students can't backdate.
- Instructors see submissions, post in Announcements, moderate and manage resources/events **only in cohorts they teach**. Campus-wide content and the catalogue (including prices) are admin-only.
- Notifications: users can only mark them read. Mentions only notify people who can see the space.
- Certificates: owners and admins read rows; anyone can verify a single ID through `verify_certificate()`.

---

## Phase 0: Foundations ✅

- [x] Move old repo contents to `legacy/`
- [x] Scaffold Next.js 16 + TypeScript + Tailwind 4, ESLint, Prettier (with Tailwind class sorting)
- [x] Design tokens: paper / surface / ink / muted / line / accent + six calendar colours, light and dark
- [x] Domain types for all 20 core entities
- [x] Supabase schema: 27 tables, enums, indexes, helper functions, RLS on every table
- [x] Schema validated on real Postgres (PGlite) with 14 RLS checks: membership isolation, read-only spaces, impersonation, self-promotion, self-passing labs

## Phase 1: Student V1 on demo data ✅

**Dashboard**
- [x] Greeting, cohort name, date
- [x] Next class card with classroom link (turns orange when the room is open)
- [x] Tasks: open labs and assignments with due labels, overdue state, recent completions
- [x] This week: Mon to Fri with colour-coded items
- [x] Progress: overall %, week N of M, lessons / labs / assignments counts
- [x] Cohort community pulse: new discussions, lab finishers
- [x] Instructor variant: submission counts per assignment

**Cohort**
- [x] Header with dates, week, student count, instructor, tab bar
- [x] Overview: description, curriculum with per-module status, instructor, classmates, what's included
- [x] Schedule: week-by-week list of every class, lab session, office hours, deadline
- [x] Modules + module detail: lessons with mark-done, classes, lab, assignment, resources, "ask a question" link
- [x] Classes list + live classroom page (join window opens 10 min early, recording after)
- [x] Labs: difficulty, time estimate, objectives, status, start → submit flow
- [x] Assignments: list with status/grade, detail with instructions, resources, repo submission (validated to GitHub/GitLab/Azure DevOps), grade + feedback view
- [x] Instructor roster on assignment page: submitted / late / not submitted per student
- [x] Certificate: locked preview of the real design
- [x] Projects: placeholder

**Everything else**
- [x] Community: spaces grouped (cohort-only groups locked and listed first), latest-activity feed, space pages, new post, post thread, replies, 5 reactions, @mentions highlighted and notified, pinned posts
- [x] Calendar: month grid, prev / today / next, day agenda with times and links, legend
- [x] Resources: slides, recordings, cheat sheets, templates, labs
- [x] Notifications: unread badge in nav, mark all read, click marks read and navigates. Generated on mentions, replies, submissions.
- [x] Profile: programme progress by module, achievements (7, deliberately low-key), demo profile switcher
- [x] Responsive down to 390px with no horizontal scroll; dark mode
- [x] Verified end to end in a real browser: lesson completion moves progress, assignment validation + submit, post + reply + reaction, lab submit, instructor receives mention + submission notifications

## Phase 2: Real backend ⬜

Needs from you: a Supabase project, a Stripe account, a Resend account (see **Open questions**).

- [x] **Step 1, sign-in on Supabase Auth** (on when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set; demo mode otherwise, and always in the tests). Owner setup: `docs/supabase-setup.md`.
  - Server-side clients in `src/lib/supabase/`; `src/proxy.ts` refreshes the session on every request before the sign-in gate
  - `currentUser()` / `getSessionUser()` unchanged for pages: verified claims (`getClaims`), profile from the `profiles` table, mirrored into the in-memory store for the data that hasn't moved yet
  - Sign-in, sign-out, password change (re-checks the current password, signs out other devices), same error message and rate limits as before
  - Forgot password: email link, same answer for every email, rate limited
  - Admin "add student": existing account joins; new email gets a Supabase invite to choose their own password (needs `SUPABASE_SECRET_KEY`); no temporary passwords
  - Email links land on `/auth/confirm`, which only uses the token when the person presses Continue (mail scanners open links in advance), and only continues to paths inside the app
  - Migration 0010: every new account gets a profile, always as a student (sign-up metadata can't pick a role); `user_id_by_email()` callable only with the secret key. 8 new database checks.
  - `npm run db:bundle`: all migrations as one transaction for the SQL Editor
- [x] **Step 2, all data in Supabase** (same switch: demo mode without the keys)
  - Reads: each request loads everything the person may see in one call (`app_snapshot()`, security invoker, so RLS decides); pages and their logic are unchanged. `db()` returns that request's copy (React `cache()` in pages, `withData()` around server actions and route handlers, where `cache()` doesn't apply)
  - Writes: every action goes through `src/lib/data/save.ts`, which updates the database as the signed-in person (RLS checks each write again) and this request's copy. Updates and deletes that RLS silently skips are treated as failures. Notifications to other people use the secret key
  - Migration 0011: `app_snapshot()`; admins read every cohort; public catalogue for visitors (published cohorts and their instructors, never students); staff read their students' lesson progress (was own-only: dashboards and certificate eligibility read 0%); instructors can link resources to assignments
  - Auth hardening found on the way: Supabase session cookies are HttpOnly (the default leaves them script-readable); the server check uses `getUser()`, so "sign out other devices" takes effect at once instead of when the token expires
  - `npm run db:seed` (curriculum only, never overwrites), `npm run db:check` (read-only project check), `npm run db:bundle -- 0011`
  - `npm run test:e2e:supabase`: the whole browser suite against a local Supabase (Docker, via the Supabase CLI) with the demo loaded before each test, plus real invite and password-reset emails through the local mail catcher. Runs in CI as a second job
  - Scaling note: loading everything per request suits a few hundred students; past a few thousand, move the busiest pages to targeted queries (only `src/lib/data/` changes)
- [ ] Google and LinkedIn sign-in (owner creates the Google Cloud and LinkedIn apps, enables them in Supabase; then buttons + callback)
- [ ] Rate limiting on every write (posts, comments, reactions, submissions) (security review #9). The waitlist is already limited; move `src/lib/rate-limit.ts` to a shared store so limits hold across instances.
- [x] Waitlist in Supabase, confirmation email, admin CSV export
- [ ] Email waitlisters when enrolment opens
- [ ] Dependabot or Renovate for dependency updates (two Next.js security releases landed in Sep 2026 alone)
- [x] Seed script (`npm run db:seed`, curriculum only); demo store kept as demo mode by choice
- [ ] Storage bucket `submissions` for ZIP uploads (RLS: owner + cohort instructors)
- [ ] Stripe Checkout on "Enrol now" → webhook → create profile, enrollment, cohort membership, notifications, welcome email (one transaction)
- [ ] Coupons, refunds (webhook sets payment `refunded`, removes membership, revokes any certificate), per `docs/refund-policy.md`
- [ ] Admin actions: refund a student, move a student to a later cohort (keeps lesson, lab and grade history); record the refund policy version on each payment
- [ ] Checkout shows "Full refund until week 2 starts" next to Pay, linking to the published refund policy
- [x] **Email through Resend** (`docs/email-setup.md`): waitlist confirmation, cohort welcome and teaching emails, and every activity notification by email (grades, mentions and comments, office hours, reminders), each kind switchable in Profile > Email and from a signed unsubscribe link (page with a button, plus RFC 8058 one-click). Class reminders by a secret-protected job (`/api/cron/class-reminders`), once per class and person. Sent after the response, one at a time under Resend's rate limit; skipped and logged without a key; a test outbox in the browser tests. Supabase's own invite and reset emails go through Resend SMTP (dashboard setting). Migration 0012.
- [ ] Deadline-tomorrow reminders (the job can grow into it)
- [ ] Realtime: live new posts/comments in spaces, notification badge
- [x] CI on every push and PR: typecheck, lint, formatting, `test:db`, build, Playwright suite
- [ ] Deploy (Vercel + Supabase), preview environments per PR

## Phase 3: Instructor and admin ✅

Admin area at `/admin` (the **Admin** item in the sidebar). **Admins see everything; instructors only see cohorts they teach** (same rules as `is_admin()` / `teaches()` in SQL). Catalogue, curriculum, students, waitlist and certificates are admin-only. Try it: switch to **Rakan** (admin) or **Samira** (instructor, AI Engineering only) on the profile page.

- [x] Admin shell: overview KPIs, students, curriculum, waitlist (+ CSV export), moderation; per-cohort tabs for dashboard, grading, lab reviews, attendance, classes, projects, certificates
- [x] Cohort dashboard: students, week, attendance %, submission %, average progress, **estimated revenue** (admins only, labelled "est." until Stripe), what needs grading, upcoming, at-risk students with reasons, per-student table
- [x] Curriculum editor: programme title/tagline/description/price/published, module titles, lessons (add, edit, reorder, delete). Unpublishing hides a programme from the landing page, catalogue and waitlist.
- [x] **New programme** (admins): title, tagline, description, length in weeks, USD price, certificate code (unique, 2 to 5 letters), what's included. Starts as a draft with empty Week 1 to Week N modules. No delete by design: unpublish instead, so cohorts and certificates keep their history.
- [x] **New cohort** (admins): programme, start date (today or later, UAE time) and instructor. Gets the next academy-wide number (#03…), an end date from the programme length, its own General / Announcements / Questions spaces, and notifies the instructor.
- [x] **Office hours** (per cohort). Instructors set hours per weekday in UAE time (Admin → cohort → Office hours). During those hours students can message the cohort's instructors from the cohort's Office hours tab; outside them the box is greyed out and disabled, shows when it opens next, and the server refuses messages (also enforced in SQL by `office_open()`). One thread per student, private to the student and the cohort's staff. Instructors reply any time from an inbox with unread counts (shown on the tab); both sides get notifications; a Home card shows open/closed and new replies. Seeded: DevOps #01 open Mon to Fri 08:00 to 17:00, with one sample conversation.
- [x] **Change password** (Profile → Password): needs the current password, at least 10 characters, limits wrong guesses (5 per 15 minutes), signs out every other session. Accounts created with a temporary password are flagged and nudged on the dashboard until changed.
- [x] **Remove a student from a cohort** (admins, cohort dashboard, confirm dialog, not on finished cohorts): removes access and their capstone team membership; submissions and grades are kept so re-adding picks up where they left off.
- [x] **Add a student to a cohort** (admins, on the cohort dashboard; not for finished cohorts): by email. An existing student account is added as is; a new email gets a student account with a random temporary password shown to the admin once (only the hash is stored). The student gets a welcome notification. Instructors and admins can't be added as students; duplicates are refused. No invite email yet (Phase 2 Resend).
- [x] Class scheduler: create, edit, delete (future only), recording links. 🟡 Meeting links are pasted; `src/lib/integrations/video.ts` is where Zoom API creation plugs in once `ZOOM_*` keys exist.
- [x] Grading: per-criterion rubric (default 40/25/20/15), live total, required feedback, re-grading, student notified with the grade, one-click reminder to everyone who hasn't submitted
- [x] Lab reviews: queue of submitted labs with pass / return (student notified), full status matrix. Only instructors can pass a lab.
- [x] Attendance: mark present / late / absent per class, history matrix. 🟡 Zoom participant-report import comes with the Zoom API.
- [x] Projects: teams, members, presentation slot, milestones (members or instructors tick them), repo link; students see their team and the cohort's progress
- [x] Certificates: issue at 100% only, IDs `AM-<CODE>-<YEAR>-<SEQ>`, revoke/restore, student page with **Print / Save as PDF** (print-ready layout), public `/verify/<id>` page and `/verify` lookup. A completed demo cohort (#00) has graduates so this is testable.
- [x] Moderation: pin, lock (no new replies), delete posts and replies on the post itself; queue in Admin → Moderation
- [x] Migration `0004_teaching_tools.sql` + 26 new RLS checks (70 total)
- [x] 45 end-to-end browser checks: every feature above, instructor scoping, student view of results, and an ID-swap attack on team milestones (blocked)

## Phase 4: Lab environments ⬜

- [ ] "Start lab environment" provisions a time-boxed Azure resource group (or AWS account from a pool) per student, with budget caps and auto-teardown
- [ ] Automated checks per objective (Terraform state / `az` queries) that mark labs passed

## Phase 5: AI layer ⬜

- [ ] AI tutor scoped to the programme's content
- [ ] Lab assistant that reads the student's error output
- [ ] Assignment feedback draft for instructors to approve
- [ ] "What should I work on today?" copilot on the dashboard using progress + lab history

---

## Security

Review of the whole app on 2026-09-23. Every finding was reproduced by exploiting it (browser for the app, PGlite for the database) and re-tested after the fix.

**Dependencies.** Next.js 16.3.6 (includes the 22 Sep 2026 fix for GHSA-vcvr-r3jv-pc5j), React 19.2.8 (past CVE-2025-55182 and its follow-ups), `npm audit` clean. Recheck on every Next.js security release.

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| 1 | High | Demo sign-in is a cookie with a user ID, so anyone can be anyone | ✅ Real sign-in (see Decisions → Auth). Tested: forged/old cookies, replayed tokens after sign-out, session fixation, open redirect via `next`, lockout, cookie flags, and replaying a captured one-click demo sign-in against production (refused). |
| 2 | High | Students could mark their own lab **passed** by editing the `.bind()` argument | ✅ Runtime check in `updateLab`. Exploit re-run: blocked. |
| 3 | Medium | Authors could move their post into Announcements and pin it | ✅ `posts_guard` trigger + per-space moderation (0002) |
| 4 | Medium | Students could backdate `submitted_at` and re-point submissions | ✅ `submissions_guard` trigger sets server time, locks owner/assignment/folder (0002) |
| 5 | Medium | Every instructor could edit the whole catalogue (incl. prices) and every cohort | ✅ New `admin` role, instructors scoped to cohorts they teach (0002 + app) |
| 6 | Low | Mentions notified people outside the space, leaking private post titles | ✅ Visibility check, max 10 mentions per post |
| 7 | Low | Users could rewrite notification links, then get redirected there | ✅ Only `read_at` is updatable (0002); app only redirects to in-app paths |
| 8 | Low | No security headers, `X-Powered-By` exposed, clickjacking possible | ✅ Nonce CSP in `src/proxy.ts`, headers in `next.config.ts` |
| 9 | Low | No rate limits; in-memory store grows forever | 🟡 Waitlist rate-limited (5/min per IP) and capped; other writes in Phase 2 |
| 10 | Info | Cookie not `Secure`; certificates table public | ✅ `Secure` in production; `verify_certificate()` replaces the public table |
| n/a | Bug | 0001's submission update policy recursed, so no student could ever update a submission | ✅ Fixed in 0002 (`is_graded()`), found by the new test suite |
| n/a | Bug | Every form cleared what you typed when the server rejected it (React 19 resets `<form action>` after every submission), e.g. a post body or grading feedback vanished on a validation error | ✅ `useFormAction` hook keeps input; create forms clear only on success |

## Landing page ✅

Public page at `/`, the app moved behind it at `/dashboard`. Aimed at career switchers, main action is **join the waitlist**.

- [x] **Redesign (24 Sep):** Dusk hero with the headline, the class times and the waitlist form, above a six-week strip for the next cohort ("Starts" marker in Lamp, capstone demo in the last week). The strip fills in once on load; no motion with reduced-motion on.
- [x] Then: most courses vs AcadeMe; a real Monday to Friday timetable with times (same colours as the app calendar); what's included as a two-column list; programmes side by side with week list and large price; instructor and what you leave with; FAQ; Dusk closing band. No icon cards, no "A · B" strings, no arrows on links.
- [x] Every price, date and curriculum item is read from the same data the app uses. No invented stats, testimonials or student counts.
- [x] Programme cards preselect the programme in the form and scroll to it
- [x] Waitlist action: email validation, per-IP rate limit, honeypot for bots, de-duplication, same response whether or not you're already listed (no enumeration)
- [x] `0003_waitlist.sql`: anyone can join, only admins can read, 9 RLS checks
- [x] Responsive (390px, no horizontal scroll), dark mode, SEO title/description/Open Graph
- [x] Admin view of the waitlist with CSV export (Phase 3)
- [ ] Real bio and photo for Rakan (waiting on you)
- [ ] Marketing pages ignore dark mode on purpose (the Dusk bands carry the evening look); revisit if wanted

## UX pass

From a review of the running app (24 Sep 2026). All three batches done.

**Done**
- [x] **Lessons you can actually take:** lesson pages at `/cohorts/…/modules/<module>/<lesson>` with real content, lesson N of M, prev/next, a module sidebar, and **Mark done and continue** (crosses into the next module). Week 4 (Kubernetes) has full lessons; other weeks show their summary until content is written. Video lessons show a placeholder until a video host is connected.
- [x] **Continue where you left off** card at the top of the dashboard; dashboard tasks show open work only ("N done recently").
- [x] **Current work first:** labs, assignments and classes list what's open or next at the top; finished items fold into a collapsed "Completed / Handed in / Past classes" group. Links to a folded item (e.g. `/labs#lab_1`) open the group.
- [x] **Instant feedback:** every form button shows a spinner and can't be double-submitted; lesson done toggles and reactions update immediately with the server catching up; "Lesson marked done · Undo" toast.
- [x] **Real confirm dialogs** (native `<dialog>`, Esc cancels, Cancel focused first) for deleting posts, replies, lessons, classes and revoking certificates.
- [x] Fixed horizontal scroll at 390px on 9 pages (grid columns growing to fit long text); all 32 main pages checked.

- [x] **Less chrome:** cohort inner tabs get a one-line header instead of the big title block; inside an admin cohort there's one tab bar (not two) and a cohort switcher that keeps you on the same tab; community shows General plus your cohort, with topic spaces folded under "More spaces" (opens automatically when you're in one).
- [x] **Phone navigation:** labelled bottom bar (Home, Learn, Community, Calendar, More). More holds Resources, Notifications, Profile, Admin and sign out. Bell with unread count in the top bar. Sideways-scrolling tab rows fade at the edge and keep the active tab in view.
- [x] **Colour means something:** orange is for "act now" (live, next, this week, waiting on you) and the brand. Statuses got calmer: quiet outline for not started, grey for submitted or in progress, green/amber/red for outcomes.
- [x] **Attendance starts blank.** Nothing is pre-marked present. "Mark remaining present" fills the unmarked rows and leaves late/absent alone; a counter shows who's still unmarked. Unmarked rows aren't saved.
- [x] **Grading one at a time:** submission queue on the left (ungraded first, oldest first), one submission on the right with an Open repo button. **Save and next ungraded** saves and jumps to the next one (server-side redirect, works without JavaScript), then confirms whose grade was saved. `j`/`k` step through, ⌘/Ctrl+Enter saves.
- [x] Profile shows your real certificates with their public verify links; removed two stale "Phase 3" notes.

- [x] **Progress % explained** wherever it shows: "10/19 lessons · 3/6 labs · 3/5 assignments", and that each counts the same.
- [x] **Sign-in** is a centred card with a "Join the waitlist" link for people who aren't students yet.
- [x] **First-visit welcome** on the dashboard: three lines on how it works (different copy for students and staff), a start button, and "Got it". Stored as `profiles.onboarded_at`.
- [x] **Fewer mono labels:** section and card labels are plain sans now. Mono stays for numbers, codes, dates and status pills.
- [x] **⌘K / Ctrl+K search** (also `/`, and a Search button in the sidebar and phone header) over pages, lessons, labs, assignments, classes, spaces and admin tools. The index comes from the same permission checks as the pages, so you only find what you could open, and it loads on first use instead of with every page.
- [x] **Unread counts per space:** new posts by others since your last visit (or the past week if you've never opened it). Opening a space clears its badge and marks the new posts "New" for that visit. Stored in `space_reads`, private per user.
- [x] Global focus ring moved into the CSS base layer so components can style their own focus.

## Out of scope for V1 (on purpose)

Full Circle parity: DMs, member directory, events ticketing, custom domains, white-labelling, native apps, heavy gamification.

---

## Open questions for you

1. ~~**Timezone.**~~ Answered: UAE time (`Asia/Dubai`).
2. **Phase 2 accounts.** When you're ready: Supabase project, Stripe account, Resend account. Add keys as environment secrets, never in the repo.
3. ~~**Sign-in methods.**~~ Answered: email + password, Google, LinkedIn.
4. ~~**Certificate ID prefix.**~~ Answered: `ACM-`. (Heads-up: ACM is also the Association for Computing Machinery. Fine for an ID, but worth knowing.)
5. **Refund policy.** Rule decided (full refund until week 2). Draft in `docs/refund-policy.md`: fill in the [bracketed] details and get a UAE lawyer to check it before it's published.
6. **Prices in USD.** Now **$670** (DevOps) and **$790** (AI Engineering), converted from euros and rounded. The AI price started as a number I made up. Confirm both, or change them in `src/lib/data/seed.ts`.
7. **Landing page claims to confirm:** "8 to 10 hours a week" and "no cloud experience needed". (The certificate verification link now exists.) Edit the FAQ in `src/app/(marketing)/page.tsx` if any are wrong.
8. **Instructor bio.** Currently name and role only. Send a few lines and a photo when you want them on the page.

---

## Log

| Date | Change |
| --- | --- |
| 2026-09-23 | Phase 0 and Phase 1 complete. Next.js app at repo root, demo store, 21 pages, Supabase schema with RLS validated on PGlite, browser-tested flows. |
| 2026-09-23 | Security review and fixes (#2 to #8, #10), migration 0002, `npm run test:db` (35 checks), admin role, setup guide in README. |
| 2026-09-23 | Landing page at `/` with waitlist, migration 0003, rate limiter, `test:db` now 44 checks. |
| 2026-09-23 | Phase 3: admin area, grading, lab reviews, attendance, classes, projects, certificates + public verify, moderation, curriculum editor. Migration 0004, `test:db` 70 checks. Fixed forms losing input after a validation error (React 19 auto-reset). |
| 2026-09-23 | Replaced cookie auth with email + password sign-in, server-side sessions and a sign-in gate; demo login limited to dev. 32 auth checks (27 attack, 4 demo toggle, 1 dev). |
| 2026-09-24 | UX batch 1: lesson pages + continue learning, current work first, instant feedback with undo, confirm dialogs, mobile overflow fixes. 29 new browser checks. |
| 2026-09-24 | UX batch 2: one-line cohort header, single admin tab bar + cohort switcher, folded community spaces, mobile bottom bar, calmer status colours, blank attendance + mark remaining, one-at-a-time grading with save and next. 35 new browser checks. |
| 2026-09-24 | UX batch 3: progress breakdown, sign-in card, first-visit welcome, sans labels, ⌘K search, unread counts per space. Migration 0005, `test:db` 78 checks, 24 new browser checks. |
| 2026-09-24 | Owner answers: UAE timezone (`Asia/Dubai`), USD pricing, `ACM-` certificate IDs, sign-in = email + password + Google + LinkedIn. Refund policy drafted (`docs/refund-policy.md`). Migration 0006. |
| 2026-09-24 | Admins can create programmes (draft, empty weekly modules) and cohorts (instructor, spaces, notification). Migration 0007, `test:db` 91 checks, 24 new browser checks. |
| 2026-09-24 | Admins can add students to a cohort by email (existing account, or a new one with a one-time temporary password). 20 new browser checks plus a replay test: an instructor replaying the admin action is refused. |
| 2026-09-24 | Change password (with temporary-password nudge, other sessions signed out), remove student from cohort, landing redesign around the evening schedule (Dusk/Chalk/Lamp palette, Archivo, six-week strip). 17 new browser checks; fixed a mobile overflow from a screen-reader-only table header. |
| 2026-09-24 | Office hours: per-weekday schedule, messaging only while open (UI + server + RLS), instructor inbox with replies, Home card. Migration 0008, `test:db` 111 checks, 30 new browser checks. Fixed the app's main column overflowing at tablet widths (768px) on every page. |
| 2026-09-24 | Code review of 77bcabb (office hours), all four findings fixed: thread updates limited to each side's own read time (0009, column grants + trigger; last_message_at set by the database; server timestamps); removed students can't write in old threads; unread counts refresh without reload and new messages in an open thread get marked read; database timezone comes from `app.academy_timezone`. 13 new RLS checks (124). |
| 2026-09-24 | QA: Playwright suite in `tests/e2e/` (65 tests: every feature by role, permissions, tampered requests, layout at 1440/768/390 px), secret-gated reset hook, GitHub Actions CI. Found and fixed: the assignment form's errors weren't announced to screen readers; reseeding reused already-edited seed objects. |
| 2026-09-24 | Phase 2 step 1: Supabase Auth for sign-in, password reset and student invites, with demo mode kept for development and tests. Migration 0010, `docs/supabase-setup.md`. |
| 2026-09-24 | Phase 2 step 2: all data in Supabase (one RLS-filtered snapshot per request, writes as the signed-in person). Migration 0011. Whole browser suite passes against a local Supabase too (66 each mode), including real invite and reset emails; CI runs both. Found and fixed: staff couldn't see student progress; session cookies weren't HttpOnly; revoked sessions lived until token expiry. |
| 2026-09-24 | Email through Resend: app emails with per-kind opt-out and signed unsubscribe, class reminder job, test outbox, `npm run email:test`. Migration 0012. Browser suite 70 in each mode. |
