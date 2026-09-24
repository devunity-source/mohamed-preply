"use server";

import { cohortAssignments, cohortClasses, cohortLabs, modulesFor, myCohorts, visibleSpaces } from "@/lib/data/repo";
import { cohortById } from "@/lib/data/admin";
import { hasAdminArea, isAdmin, managedCohortIds } from "@/lib/authz";
import { currentUser } from "@/lib/session";
import { withData } from "@/lib/data/store";
import { formatShortDate } from "@/lib/time";
import { getI18n } from "@/lib/i18n/server";
import { loc } from "@/lib/i18n/content";
import type { Key, T } from "@/lib/i18n/translate";
import type { Cohort, Locale, Profile, Programme } from "@/lib/types";

type Kind = "Page" | "Lesson" | "Lab" | "Assignment" | "Class" | "Space" | "Admin";

export interface SearchItem {
  label: string;
  hint: string;
  href: string;
  kind: Kind;
  /** `kind` in the reader's language, shown and searched. */
  kindLabel: string;
}

const KIND_LABEL: Record<Kind, Key> = {
  Page: "search.kindPage",
  Lesson: "search.kindLesson",
  Lab: "search.kindLab",
  Assignment: "search.kindAssignment",
  Class: "search.kindClass",
  Space: "search.kindSpace",
  Admin: "search.kindAdmin",
};

type Draft = Omit<SearchItem, "kindLabel">;

/**
 * Everything the ⌘K palette can jump to, built from the same permission-aware
 * queries as the pages themselves: you can only find what you could click to.
 * Loaded on first open rather than shipped with every page.
 */
export const searchIndex = withData(async (): Promise<SearchItem[]> => {
  const { t, locale } = await getI18n();
  const user = await currentUser();
  const items: Draft[] = [
    { label: t("common.home"), hint: t("search.hintHome"), href: "/dashboard", kind: "Page" },
    { label: t("common.programmes"), hint: t("search.hintProgrammes"), href: "/programmes", kind: "Page" },
    { label: t("common.community"), hint: t("search.hintCommunity"), href: "/community", kind: "Page" },
    { label: t("common.calendar"), hint: t("search.hintCalendar"), href: "/calendar", kind: "Page" },
    { label: t("common.resources"), hint: t("search.hintResources"), href: "/resources", kind: "Page" },
    { label: t("common.notifications"), hint: "", href: "/notifications", kind: "Page" },
    { label: t("common.profile"), hint: t("search.hintProfile"), href: "/profile", kind: "Page" },
  ];

  for (const { cohort, programme } of myCohorts(user.id)) items.push(...cohortItems(cohort, programme, t, locale));
  for (const space of visibleSpaces(user.id)) {
    const s = loc(space, locale);
    items.push({ label: s.name, hint: s.group, href: `/community/${s.slug}`, kind: "Space" });
  }
  if (hasAdminArea(user)) items.push(...staffItems(user, t));
  return items.map((i) => ({ ...i, kindLabel: t(KIND_LABEL[i.kind]) }));
});

/** A cohort's page plus its lessons, labs, assignments and classes. */
function cohortItems(cohort: Cohort, programme: Programme, t: T, locale: Locale): Draft[] {
  const base = `/cohorts/${cohort.id}`;
  const items: Draft[] = [{ label: cohort.name, hint: loc(programme, locale).title, href: base, kind: "Page" }];
  for (const { module, lessons } of modulesFor(programme.id)) {
    const m = loc(module, locale);
    for (const lesson of lessons) {
      const l = loc(lesson, locale);
      items.push({
        label: l.title,
        hint: t("search.hintWeek", { week: m.week, title: m.title }),
        href: `${base}/modules/${m.id}/${l.id}`,
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
      hint: t("search.hintDue", { date: formatShortDate(a.dueAt, locale) }),
      href: `${base}/assignments/${a.id}`,
      kind: "Assignment",
    });
  }
  for (const c of cohortClasses(cohort.id)) {
    items.push({
      label: c.title,
      hint: formatShortDate(c.startsAt, locale),
      href: `${base}/classes/${c.id}`,
      kind: "Class",
    });
  }
  return items;
}

const COHORT_TABS = [
  ["grading", "search.grading"],
  ["labs", "search.labReviews"],
  ["attendance", "search.attendance"],
  ["classes", "search.classes"],
] as const;

/** Admin pages, then the teaching tabs of every cohort this person manages. */
function staffItems(user: Profile, t: T): Draft[] {
  const admin = t("search.hintAdmin");
  const items: Draft[] = isAdmin(user)
    ? [
        { label: t("search.students"), hint: admin, href: "/admin/students", kind: "Admin" },
        { label: t("search.curriculum"), hint: admin, href: "/admin/programmes", kind: "Admin" },
        { label: t("search.waitlist"), hint: admin, href: "/admin/waitlist", kind: "Admin" },
        {
          label: t("search.newProgramme"),
          hint: t("search.hintNewProgramme"),
          href: "/admin/programmes/new",
          kind: "Admin",
        },
        { label: t("search.newCohort"), hint: t("search.hintNewCohort"), href: "/admin/cohorts/new", kind: "Admin" },
      ]
    : [];
  items.push({ label: t("search.moderation"), hint: admin, href: "/admin/moderation", kind: "Admin" });
  for (const id of managedCohortIds(user)) {
    const name = cohortById(id)!.name;
    for (const [tab, label] of COHORT_TABS) {
      items.push({ label: t(label), hint: name, href: `/admin/cohorts/${id}/${tab}`, kind: "Admin" });
    }
  }
  return items;
}
