"use server";

import { cohortAssignments, cohortClasses, cohortLabs, modulesFor, myCohorts, visibleSpaces } from "@/lib/data/repo";
import { cohortById } from "@/lib/data/admin";
import { hasAdminArea, isAdmin, managedCohortIds } from "@/lib/authz";
import { currentUser } from "@/lib/session";
import { formatShortDate } from "@/lib/time";

export interface SearchItem {
  label: string;
  hint: string;
  href: string;
  kind: "Page" | "Lesson" | "Lab" | "Assignment" | "Class" | "Space" | "Admin";
}

/**
 * Everything the ⌘K palette can jump to, built from the same permission-aware
 * queries as the pages themselves: you can only find what you could click to.
 * Loaded on first open rather than shipped with every page.
 */
export async function searchIndex(): Promise<SearchItem[]> {
  const user = await currentUser();
  const items: SearchItem[] = [
    { label: "Home", hint: "Dashboard", href: "/dashboard", kind: "Page" },
    { label: "Programmes", hint: "Your cohorts", href: "/programmes", kind: "Page" },
    { label: "Community", hint: "Latest activity", href: "/community", kind: "Page" },
    { label: "Calendar", hint: "Classes, deadlines, events", href: "/calendar", kind: "Page" },
    { label: "Resources", hint: "Slides, recordings, cheat sheets", href: "/resources", kind: "Page" },
    { label: "Notifications", hint: "", href: "/notifications", kind: "Page" },
    { label: "Profile", hint: "Progress, certificates, sign out", href: "/profile", kind: "Page" },
  ];

  for (const { cohort, programme } of myCohorts(user.id)) {
    const base = `/cohorts/${cohort.id}`;
    items.push({ label: cohort.name, hint: programme.title, href: base, kind: "Page" });
    for (const { module, lessons } of modulesFor(programme.id)) {
      for (const l of lessons) {
        items.push({
          label: l.title,
          hint: `Week ${module.week} · ${module.title}`,
          href: `${base}/modules/${module.id}/${l.id}`,
          kind: "Lesson",
        });
      }
    }
    for (const lab of cohortLabs(cohort.id)) {
      items.push({ label: lab.title, hint: cohort.name, href: `${base}/labs#${lab.id}`, kind: "Lab" });
    }
    for (const a of cohortAssignments(cohort.id)) {
      items.push({
        label: a.title,
        hint: `Due ${formatShortDate(a.dueAt)}`,
        href: `${base}/assignments/${a.id}`,
        kind: "Assignment",
      });
    }
    for (const c of cohortClasses(cohort.id)) {
      items.push({ label: c.title, hint: formatShortDate(c.startsAt), href: `${base}/classes/${c.id}`, kind: "Class" });
    }
  }

  for (const s of visibleSpaces(user.id)) {
    items.push({ label: s.name, hint: s.group, href: `/community/${s.slug}`, kind: "Space" });
  }

  if (hasAdminArea(user)) {
    if (isAdmin(user)) {
      items.push(
        { label: "Students", hint: "Admin", href: "/admin/students", kind: "Admin" },
        { label: "Curriculum", hint: "Admin", href: "/admin/programmes", kind: "Admin" },
        { label: "Waitlist", hint: "Admin", href: "/admin/waitlist", kind: "Admin" },
      );
    }
    items.push({ label: "Moderation", hint: "Admin", href: "/admin/moderation", kind: "Admin" });
    for (const id of managedCohortIds(user)) {
      const name = cohortById(id)!.name;
      for (const [tab, label] of [
        ["grading", "Grading"],
        ["labs", "Lab reviews"],
        ["attendance", "Attendance"],
        ["classes", "Classes"],
      ]) {
        items.push({ label, hint: name, href: `/admin/cohorts/${id}/${tab}`, kind: "Admin" });
      }
    }
  }
  return items;
}
