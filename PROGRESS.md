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
| Auth (now) | Cookie picks a seeded profile. Default is Ahmed (student). Switch profiles on `/profile`. | Lets you see both student and instructor views. Disabled automatically once `NEXT_PUBLIC_SUPABASE_URL` is set. |

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # route types + tsc
npm run lint
npm run format       # prettier + tailwind class sorting
npm run build
```

Demo data resets on every server restart. The seed always places the active cohort in **week 4 of 6**, so the dashboard looks alive whenever you open it.

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
legacy/                             previous repo contents, untouched
```

**Access rules** live in two places that must stay in sync: server actions/`repo.ts` (demo mode) and RLS policies (Supabase). Rules today:

- You see a cohort, its classes, labs, assignments, resources and spaces only if you're a member.
- Students write only their own progress, lab attempts, submissions, posts, comments and reactions.
- Students can't post in read-only spaces (Announcements), can't mark labs as passed, can't edit graded submissions, can't change their own role.
- Cohort instructors see every submission in their cohort. Admins see everything.
- Certificates are publicly readable (for the verification URL).

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
- [ ] Auth: email magic link + Google. `proxy.ts` refreshes the session. Replace `currentUser()`.
- [ ] Rewrite `repo.ts` and `actions.ts` bodies against Supabase; delete the demo store
- [ ] Seed script that loads `seed.ts` data into Supabase for staging
- [ ] Storage bucket `submissions` for ZIP uploads (RLS: owner + cohort instructors)
- [ ] Stripe Checkout on "Enrol now" → webhook → create profile, enrollment, cohort membership, notifications, welcome email (one transaction)
- [ ] Coupons, refunds (webhook sets payment `refunded`, removes membership)
- [ ] Resend: welcome, class-starts-in-30-min, deadline-tomorrow, graded, mentioned
- [ ] Realtime: live new posts/comments in spaces, notification badge
- [ ] Deploy (Vercel + Supabase), preview environments per PR, CI running typecheck/lint/build

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

## Out of scope for V1 (on purpose)

Full Circle parity: DMs, member directory, events ticketing, custom domains, white-labelling, native apps, heavy gamification.

---

## Open questions for you

1. **Timezone.** I assumed `Europe/Amsterdam`. Correct?
2. **Phase 2 accounts.** When you're ready: Supabase project, Stripe account, Resend account. Add keys as environment secrets, never in the repo.
3. **Sign-in methods.** Magic link + Google is my default. Want LinkedIn or GitHub too?
4. **Certificate ID prefix.** Using `AM-` for AcadeMe. OK?
5. **Refund policy.** Needed before Stripe goes live (e.g. full refund before week 2).

---

## Log

| Date | Change |
| --- | --- |
| 2026-09-23 | Phase 0 and Phase 1 complete. Next.js app at repo root, demo store, 21 pages, Supabase schema with RLS validated on PGlite, browser-tested flows. |
