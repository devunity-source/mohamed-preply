import "server-only";
import { notFound } from "next/navigation";
import { cohortForUser } from "@/lib/data/repo";
import { currentUser } from "@/lib/session";

/** Resolve the signed-in user and a cohort they belong to, or 404. */
export async function loadCohort(params: Promise<{ cohortId: string }>) {
  const { cohortId } = await params;
  const user = await currentUser();
  const summary = cohortForUser(cohortId, user.id);
  if (!summary) notFound();
  return { user, ...summary };
}
