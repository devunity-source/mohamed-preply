import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { keyOf, TABLES, toRow, type Persisted, type TableMap } from "./schema";
import { db, newId } from "./store";
import { emailActivity, type ActivityKind } from "@/lib/email/notify";
import type { Store } from "./seed";
import type { Assignment, Submission } from "@/lib/types";

// Every write goes through here. It changes db() (the demo store, or this
// request's copy of the database) and, with Supabase, the database itself.
//
// Writes run as the signed-in person, so row level security checks them a
// second time after the app's own checks. `privileged` writes use the secret
// key instead; only for side effects nobody may do directly, like notifying
// someone else, and only after the action has checked permissions.

type Item<K extends keyof Store> = Store[K][number];
type Row = Record<string, unknown>;
interface Options {
  privileged?: boolean;
}

const GRADE_FIELDS = ["grade", "feedback", "rubricScores", "gradedBy", "gradedAt"] as const;

async function client(opts?: Options) {
  if (!opts?.privileged) return createClient();
  const admin = createAdminClient();
  if (!admin) throw new Error("This needs SUPABASE_SECRET_KEY on the server. See docs/supabase-setup.md.");
  return admin;
}

function mapFor(name: keyof Store): TableMap | null {
  return (TABLES as Record<string, TableMap>)[name as Persisted] ?? null;
}

function fail(action: string, table: string, message: string): never {
  throw new Error(`Couldn't ${action} ${table}: ${message}`);
}

export async function insert<K extends keyof Store>(name: K, item: Item<K>, opts?: Options): Promise<Item<K>> {
  (db()[name] as Item<K>[]).push(item);
  const map = mapFor(name);
  if (!supabaseEnabled() || !map) return item;
  const sb = await client(opts);
  const { error } = await sb.from(map.table).insert(toRow(map, item as unknown as Row));
  if (error) fail("add to", map.table, error.message);
  if (name === "submissions") await saveGrade(item as Submission, opts);
  if (name === "assignments") await saveResources(item as Assignment, opts);
  return item;
}

export async function update<K extends keyof Store>(
  name: K,
  target: Item<K>,
  patch: Partial<Item<K>>,
  opts?: Options,
): Promise<void> {
  Object.assign(target as object, patch);
  const map = mapFor(name);
  if (!supabaseEnabled() || !map) return;
  const sb = await client(opts);
  const row = toRow(map, patch as Row);
  if (Object.keys(row).length > 0) {
    // Row level security skips rows it doesn't allow instead of failing, so
    // ask for the changed rows back: none means it wasn't allowed.
    const { data, error } = await sb
      .from(map.table)
      .update(row)
      .match(keyOf(map, target as unknown as Row))
      .select();
    if (error) fail("update", map.table, error.message);
    if (!data?.length) fail("update", map.table, "not allowed, or it no longer exists");
  }
  if (name === "submissions" && GRADE_FIELDS.some((f) => f in (patch as object))) {
    await saveGrade(target as Submission, opts);
  }
  if (name === "assignments" && "resourceIds" in (patch as object)) await saveResources(target as Assignment, opts);
}

export async function remove<K extends keyof Store>(name: K, target: Item<K>, opts?: Options): Promise<void> {
  const list = db()[name] as Item<K>[];
  const i = list.indexOf(target);
  if (i >= 0) list.splice(i, 1);
  const map = mapFor(name);
  if (!supabaseEnabled() || !map) return;
  const sb = await client(opts);
  const { data, error } = await sb
    .from(map.table)
    .delete()
    .match(keyOf(map, target as unknown as Row))
    .select();
  if (error) fail("remove from", map.table, error.message);
  if (!data?.length) fail("remove from", map.table, "not allowed, or it no longer exists");
}

/** Removes every item matching `test`. */
export async function removeWhere<K extends keyof Store>(name: K, test: (item: Item<K>) => boolean, opts?: Options) {
  for (const item of (db()[name] as Item<K>[]).filter(test)) await remove(name, item, opts);
}

/** The app keeps grades on the submission; the database has a grades table. */
async function saveGrade(sub: Submission, opts?: Options) {
  const sb = await client(opts);
  if (sub.grade === null) {
    const { error } = await sb.from("grades").delete().eq("submission_id", sub.id);
    if (error) fail("remove from", "grades", error.message);
    return;
  }
  const { error } = await sb.from("grades").upsert({
    submission_id: sub.id,
    grade: sub.grade,
    feedback: sub.feedback,
    rubric_scores: sub.rubricScores,
    graded_by: sub.gradedBy,
    graded_at: (sub.gradedAt ?? new Date()).toISOString(),
  });
  if (error) fail("save", "grades", error.message);
}

/** The app keeps linked resource ids on the assignment; the database has a join table. */
async function saveResources(a: Assignment, opts?: Options) {
  const sb = await client(opts);
  const { error } = await sb.from("assignment_resources").delete().eq("assignment_id", a.id);
  if (error) fail("update", "assignment_resources", error.message);
  if (a.resourceIds.length === 0) return;
  const rows = a.resourceIds.map((resource_id) => ({ assignment_id: a.id, resource_id }));
  const { error: insertError } = await sb.from("assignment_resources").insert(rows);
  if (insertError) fail("update", "assignment_resources", insertError.message);
}

/**
 * Notifies someone in the app and, when `email` says which kind it is, by
 * email too (unless they turned that kind off). In-app notifications are side
 * effects nobody may create directly, so with Supabase they use the secret
 * key. If that fails (say, the key isn't set), the action that triggered it
 * still counts: the failure is logged, not thrown.
 */
export async function notify(userId: string, text: string, href: string, email?: ActivityKind): Promise<void> {
  const item = { id: newId("n"), userId, text, href, createdAt: new Date(), readAt: null };
  try {
    await insert("notifications", item, { privileged: true });
  } catch (e) {
    console.error(`Notification not sent: ${(e as Error).message}`);
  }
  if (email) emailActivity(userId, text, href, email);
}
