import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/data/store";
import { teaches } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";
import type { Profile, Space } from "@/lib/types";

// Admin-area access. Mirrors is_admin(), teaches() and can_moderate_space()
// in the SQL migrations:
//   admin       everything
//   instructor  only cohorts they teach
//   student     nothing

export const isAdmin = (user: Profile) => user.role === "admin";

export function canManageCohort(user: Profile, cohortId: string): boolean {
  return isAdmin(user) || teaches(user.id, cohortId);
}

export function canModerate(user: Profile, space: Space): boolean {
  return isAdmin(user) || (!!space.cohortId && teaches(user.id, space.cohortId));
}

/** Cohort ids this user may manage, newest first. */
export function managedCohortIds(user: Profile): string[] {
  return db()
    .cohorts.filter((c) => canManageCohort(user, c.id))
    .sort((a, b) => b.startsOn.getTime() - a.startsOn.getTime())
    .map((c) => c.id);
}

export function hasAdminArea(user: Profile): boolean {
  return isAdmin(user) || managedCohortIds(user).length > 0;
}

// Page guards: 404 rather than 403 so the admin area doesn't reveal what exists.

export async function requireAdminArea(): Promise<Profile> {
  const user = await currentUser();
  if (!hasAdminArea(user)) notFound();
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  return user;
}

export async function requireCohortManager(cohortId: string): Promise<Profile> {
  const user = await currentUser();
  if (!db().cohorts.some((c) => c.id === cohortId) || !canManageCohort(user, cohortId)) notFound();
  return user;
}
