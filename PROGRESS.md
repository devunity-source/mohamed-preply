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
| 3 | Instructor/admin area, grading, projects, certificates, attendance | ⬜ |
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
| Timezone | All schedule times in `Europe/Amsterdam`, set via `ACADEMY_TIMEZONE` | **Assumption.** Pricing is in euros so I picked CET/CEST. Change the env var if you teach from elsewhere. |
| Video | Zoom links for V1, LiveKit later | Brief says integrate first, build later. |
| Design | Warm off-white paper, near-black ink, one signal-orange accent, mono uppercase labels, square geometry. Light + dark. | Matches "bold, geometric, minimalist". |
| Auth (now) | Cookie picks a seeded profile. Default is Ahmed (student). Switch profiles on `/profile`. | Lets you see both student and instructor views. Disabled automatically once `NEXT_PUBLIC_SUPABASE_URL` is set. **Not safe on a public URL.** |
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
│   ├── globals.css              design tokens (light + dark)
│   └── not-found.tsx
├── components/                  ui primitives, nav, forms, certificate
├── proxy.ts                     per-request Content Security Policy
└── lib/
    ├── types.ts                 domain model (mirrors SQL)
    ├── time.ts                  timezone-aware date helpers
    ├── session.ts               current user (demo cookie for now)
    ├── actions.ts               all writes (server actions, each re-checks access)
    └── data/
        ├── seed.ts              demo data
        ├── store.ts             in-memory store
        └── repo.ts              every read query  ← swap point for Supabase
supabase/migrations/0001_init.sql   full schema + RLS
supabase/migrations/0002_security_hardening.sql   review fixes
supabase/migrations/0003_waitlist.sql             landing page waitlist
supabase/tests/rls.test.mjs         44 RLS checks on PGlite (npm run test:db)
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

- [ ] Supabase clients (`@supabase/ssr`, already installed) for server components and actions
- [ ] Auth: email magic link + Google. Add the Supabase session refresh to the existing `src/proxy.ts` (keep the CSP). Replace `currentUser()`. Remove the demo profile switcher.
- [ ] Rate limiting on every write (posts, comments, reactions, submissions) (security review #9). The waitlist is already limited; move `src/lib/rate-limit.ts` to a shared store so limits hold across instances.
- [ ] Waitlist: store in Supabase (`0003_waitlist.sql`), confirmation email via Resend, admin export, invite waitlisters when enrolment opens
- [ ] Dependabot or Renovate for dependency updates (two Next.js security releases landed in Sep 2026 alone)
- [ ] Rewrite `repo.ts` and `actions.ts` bodies against Supabase; delete the demo store
- [ ] Seed script that loads `seed.ts` data into Supabase for staging
- [ ] Storage bucket `submissions` for ZIP uploads (RLS: owner + cohort instructors)
- [ ] Stripe Checkout on "Enrol now" → webhook → create profile, enrollment, cohort membership, notifications, welcome email (one transaction)
- [ ] Coupons, refunds (webhook sets payment `refunded`, removes membership)
- [ ] Resend: welcome, class-starts-in-30-min, deadline-tomorrow, graded, mentioned
- [ ] Realtime: live new posts/comments in spaces, notification badge
- [ ] Deploy (Vercel + Supabase), preview environments per PR, CI running typecheck, lint, `test:db` and build

## Phase 3: Instructor and admin ⬜

- [ ] Admin shell: students, programmes, cohorts, curriculum, classes, assignments, projects, community moderation, attendance, grades, certificates, analytics
- [ ] Cohort dashboard: revenue, attendance %, submission %, average progress, upcoming
- [ ] Curriculum editor (modules, lessons, reorder)
- [ ] Class scheduler with Zoom API meeting creation, recordings auto-attached
- [ ] Grading: rubric, grade + feedback, bulk actions, notify student
- [ ] Attendance capture (Zoom participant report import)
- [ ] Projects: teams, milestones, repo link, progress, presentation slot
- [ ] Certificates: issue on completion, ID format `AM-<PROG>-<YEAR>-<SEQ>`, PDF, public `/verify/<id>` page
- [ ] Moderation: pin, delete, lock threads

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
| 1 | High | Demo sign-in is a cookie with a user ID, so anyone can be anyone | ⬜ Phase 2 (real auth). Don't deploy publicly until then. |
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

## Landing page ✅

Public page at `/`, the app moved behind it at `/dashboard`. Aimed at career switchers, main action is **join the waitlist**.

- [x] Hero with waitlist form, next-cohort date, "explore the demo" link, geometric cohort-board graphic
- [x] Old way vs AcadeMe, six features, a typical week (colours match the app calendar), DevOps curriculum, programme cards with price and next dates, instructor (name and role only), outcomes, FAQ, closing waitlist band
- [x] Every price, date and curriculum item is read from the same data the app uses. No invented stats, testimonials or student counts.
- [x] Programme cards preselect the programme in the form and scroll to it
- [x] Waitlist action: email validation, per-IP rate limit, honeypot for bots, de-duplication, same response whether or not you're already listed (no enumeration)
- [x] `0003_waitlist.sql`: anyone can join, only admins can read, 9 RLS checks
- [x] Responsive (390px, no horizontal scroll), dark mode, SEO title/description/Open Graph
- [ ] Admin view of the waitlist (Phase 3)
- [ ] Real bio and photo for Rakan (waiting on you)

## Out of scope for V1 (on purpose)

Full Circle parity: DMs, member directory, events ticketing, custom domains, white-labelling, native apps, heavy gamification.

---

## Open questions for you

1. **Timezone.** I assumed `Europe/Amsterdam`. Correct?
2. **Phase 2 accounts.** When you're ready: Supabase project, Stripe account, Resend account. Add keys as environment secrets, never in the repo.
3. **Sign-in methods.** Magic link + Google is my default. Want LinkedIn or GitHub too?
4. **Certificate ID prefix.** Using `AM-` for AcadeMe. OK?
5. **Refund policy.** Needed before Stripe goes live (e.g. full refund before week 2).
6. **AI Engineering price.** The landing page shows **€690**. I made that number up in the seed data; the €590 DevOps price came from your brief. Confirm or change it in `src/lib/data/seed.ts`.
7. **Landing page claims to confirm:** "8 to 10 hours a week", "no cloud experience needed", and "certificate with a public verification link" (certificates arrive in Phase 3). Edit the FAQ in `src/app/(marketing)/page.tsx` if any are wrong.
8. **Instructor bio.** Currently name and role only. Send a few lines and a photo when you want them on the page.

---

## Log

| Date | Change |
| --- | --- |
| 2026-09-23 | Phase 0 and Phase 1 complete. Next.js app at repo root, demo store, 21 pages, Supabase schema with RLS validated on PGlite, browser-tested flows. |
| 2026-09-23 | Security review and fixes (#2 to #8, #10), migration 0002, `npm run test:db` (35 checks), admin role, setup guide in README. |
| 2026-09-23 | Landing page at `/` with waitlist, migration 0003, rate limiter, `test:db` now 44 checks. |
