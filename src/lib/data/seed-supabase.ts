import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLES, toRow, type Persisted, type TableMap } from "./schema";
import { seedUuid } from "./seed-ids";
import type { Store } from "./seed";

// Turns seed data (readable ids like "c_devops_01") into database rows with
// stable UUIDs. Used by `npm run db:seed` (curriculum only) and by the
// browser tests, which load the whole demo into a local Supabase.

type Row = Record<string, unknown>;

const ID_FIELD = /^(id|\w+Id|gradedBy|issuedBy)$/;

/** Every seed id, so links inside notifications can be rewritten too. */
function seedIds(store: Store): Set<string> {
  const ids = new Set<string>();
  for (const list of Object.values(store) as Row[][]) {
    for (const item of list) if (typeof item.id === "string") ids.add(item.id);
  }
  return ids;
}

function withUuids(name: Persisted, item: Row, known: Set<string>): Row {
  const out: Row = { ...item };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v !== "string" || !ID_FIELD.test(k)) continue;
    if (name === "certificates" && k === "id") continue; // "ACM-DEV-2026-00001", not a UUID
    out[k] = seedUuid(v);
  }
  if (name === "notifications") {
    out.href = String(out.href).replace(/[A-Za-z]+_[A-Za-z0-9_]+/g, (m) => (known.has(m) ? seedUuid(m) : m));
  }
  return out;
}

/** Database rows for the given collections, keyed by table name. */
export function seedRows(store: Store, collections: Persisted[]): Record<string, Row[]> {
  const known = seedIds(store);
  const out: Record<string, Row[]> = {};
  for (const name of collections) {
    const map: TableMap = TABLES[name];
    const items = (store[name] as unknown as Row[]).map((item) => withUuids(name, item, known));
    out[map.table] = items.map((item) => toRow(map, item));
    if (name === "submissions") {
      out.grades = items
        .filter((s) => s.grade !== null)
        .map((s) => ({
          submission_id: s.id,
          grade: s.grade,
          feedback: s.feedback,
          rubric_scores: s.rubricScores,
          graded_by: s.gradedBy,
          graded_at: ((s.gradedAt as Date | null) ?? new Date()).toISOString(),
        }));
    }
    if (name === "assignments") {
      out.assignment_resources = (store.assignments ?? []).flatMap((a) =>
        a.resourceIds.map((r) => ({ assignment_id: seedUuid(a.id), resource_id: seedUuid(r) })),
      );
    }
  }
  return out;
}

export const ALL_COLLECTIONS = Object.keys(TABLES) as Persisted[];

// ---------------------------------------------------------------------------
// Curriculum seed for a real project

/**
 * Adds the seed programmes, their weekly modules and lessons, and the
 * campus-wide community spaces. Only adds what's missing: anything already
 * there (matched by slug, or programme + week, or module + position) is left
 * exactly as it is, so re-running never overwrites edits. The one exception:
 * a row with no translations yet gets the seed's Arabic, so a project seeded
 * before Arabic existed picks it up.
 */
export async function seedCurriculum(
  sb: SupabaseClient,
  store: Store,
): Promise<{ added: Record<string, number>; translated: Record<string, number> }> {
  const rows = seedRows(store, ["programmes", "modules", "lessons", "spaces"]);
  const added: Record<string, number> = {};
  const translated: Record<string, number> = {};
  const insertMissing = async (table: string, list: Row[], onConflict: string) => {
    const { data, error } = await sb.from(table).upsert(list, { onConflict, ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    added[table] = data?.length ?? 0;
  };
  const isEmpty = (v: unknown) => !v || Object.keys(v as object).length === 0;
  const fillTranslations = async (table: string, list: Row[], keys: string[]) => {
    const { data, error } = await sb.from(table).select(["id", "i18n", ...keys].join(", "));
    if (error) throw new Error(`${table}: ${error.message}`);
    const existing = (data ?? []) as unknown as Row[];
    translated[table] = 0;
    for (const row of list) {
      if (isEmpty(row.i18n)) continue;
      const match = existing.find((e) => keys.every((k) => e[k] === row[k]));
      if (!match || !isEmpty(match.i18n)) continue;
      const { error: updateError } = await sb.from(table).update({ i18n: row.i18n }).eq("id", match.id);
      if (updateError) throw new Error(`${table}: ${updateError.message}`);
      translated[table]++;
    }
  };

  await insertMissing("programmes", rows.programmes, "slug");
  await fillTranslations("programmes", rows.programmes, ["slug"]);
  // A programme that already existed keeps its own id; point its modules at it.
  const { data: progs } = await sb.from("programmes").select("id, slug");
  const progId = new Map(rows.programmes.map((p) => [p.id, progs?.find((x) => x.slug === p.slug)?.id ?? p.id]));
  const modules: Row[] = rows.programme_modules.map((m) => ({ ...m, programme_id: progId.get(m.programme_id) }));
  await insertMissing("programme_modules", modules, "programme_id,week,position");
  await fillTranslations("programme_modules", modules, ["programme_id", "week", "position"]);

  const { data: mods } = await sb.from("programme_modules").select("id, programme_id, week, position");
  const modId = new Map(
    modules.map((m) => [
      m.id,
      mods?.find((x) => x.programme_id === m.programme_id && x.week === m.week && x.position === m.position)?.id ??
        m.id,
    ]),
  );
  const lessons = rows.lessons.map((l) => ({ ...l, module_id: modId.get(l.module_id) }));
  await insertMissing("lessons", lessons, "module_id,position");
  await fillTranslations("lessons", lessons, ["module_id", "position"]);

  const campus = rows.spaces.filter((s) => s.cohort_id === null);
  await insertMissing("spaces", campus, "slug");
  await fillTranslations("spaces", campus, ["slug"]);
  return { added, translated };
}

// ---------------------------------------------------------------------------
// Whole demo, for the browser tests' local Supabase

/**
 * Replaces everything in a local test database with a fresh demo. The demo
 * accounts are created once and kept (their passwords are put back each
 * time); accounts a test created are removed. Needs e2e_load() from supabase/tests/e2e-setup.sql,
 * which only the test database has.
 */
export async function loadDemo(sb: SupabaseClient, store: Store, password: string): Promise<void> {
  const { data: existing, error: listError } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`auth users: ${listError.message}`);
  for (const account of store.accounts) {
    const id = seedUuid(account.userId);
    const { error } = existing.users.some((u) => u.id === id)
      ? // A test may have changed it.
        await sb.auth.admin.updateUserById(id, { password })
      : await sb.auth.admin.createUser({ id, email: account.email, password, email_confirm: true });
    if (error) throw new Error(`auth user ${account.email}: ${error.message}`);
  }
  const { error } = await sb.rpc("e2e_load", { data: seedRows(store, ALL_COLLECTIONS) });
  if (error) throw new Error(`e2e_load: ${error.message}`);
}
