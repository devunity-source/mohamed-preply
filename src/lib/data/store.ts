import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { fromRow, TABLES, type TableMap } from "./schema";
import { createSeed, type Store } from "./seed";

// Where db() gets its data.
//
// Demo mode: one in-memory store seeded relative to server start. It lives on
// globalThis so it survives hot reloads in dev. Writes persist until the
// server restarts.
//
// Supabase mode: each request loads everything the signed-in person may read
// (app_snapshot(), filtered by row level security) once, and db() returns
// that. Writes go through ./save.ts, which updates both the database and this
// request's copy.

const globalForStore = globalThis as unknown as { __academeStore?: Store };

interface Box {
  store?: Store;
  loading?: Promise<Store>;
  /** This request's language, once known (see src/lib/i18n/server.ts). */
  locale?: "en" | "ar";
}

// Pages and layouts share one box per request through React's cache().
// cache() does nothing in server actions and route handlers, so those run
// inside withData(), which provides the box through AsyncLocalStorage.
const pageBox = cache((): Box => ({}));
const actionBox = new AsyncLocalStorage<Box>();
const box = () => actionBox.getStore() ?? pageBox();

/** Per-request scratch space shared with other modules (the language, for now). */
export const requestScope = (): Pick<Box, "locale"> => box();

export function db(): Store {
  if (!supabaseEnabled()) {
    globalForStore.__academeStore ??= createSeed();
    return globalForStore.__academeStore;
  }
  const b = box();
  if (!b.store) {
    throw new Error(
      "Data isn't loaded for this request. Pages: await loadData() (currentUser() does). Server actions and route handlers: wrap them in withData().",
    );
  }
  return b.store;
}

/** Loads this request's data from Supabase (once). A no-op in demo mode. */
export async function loadData(): Promise<void> {
  if (!supabaseEnabled()) return;
  const b = box();
  b.loading ??= fetchSnapshot().then((store) => (b.store = store));
  await b.loading;
}

/**
 * Wraps a server action or route handler so db() works inside it. The data
 * is loaded before the function runs.
 */
export function withData<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    if (!supabaseEnabled()) return fn(...args);
    return actionBox.run({}, async () => {
      await loadData();
      return fn(...args);
    });
  };
}

/**
 * For scheduled jobs, which act for no one in particular: db() holds all
 * data, read with the secret key. Only for secret-protected routes.
 */
export function withServiceData<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    if (!supabaseEnabled()) return fn(...args);
    const admin = createAdminClient();
    if (!admin) throw new Error("SUPABASE_SECRET_KEY is needed");
    return actionBox.run({ store: await fetchSnapshot(admin) }, () => fn(...args));
  };
}

type Row = Record<string, unknown>;
type Client = Awaited<ReturnType<typeof createClient>> | NonNullable<ReturnType<typeof createAdminClient>>;

async function fetchSnapshot(client?: Client): Promise<Store> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("app_snapshot");
  if (error) throw new Error(`Couldn't load data from Supabase: ${error.message}`);
  const raw = data as Record<string, Row[]>;
  const store = { accounts: [], sessions: [] } as unknown as Record<string, Row[]>;
  for (const [name, map] of Object.entries(TABLES) as [string, TableMap][]) {
    store[name] = (raw[map.table] ?? []).map((row) => fromRow(map, row));
  }

  // Grades live in their own table; the app keeps them on the submission.
  const grades = new Map((raw.grades ?? []).map((g) => [g.submission_id, g]));
  for (const sub of store.submissions) {
    const g = grades.get(sub.id);
    sub.grade = g?.grade ?? null;
    sub.feedback = g?.feedback ?? null;
    sub.rubricScores = g?.rubric_scores ?? null;
    sub.gradedBy = g?.graded_by ?? null;
    sub.gradedAt = g?.graded_at ? new Date(g.graded_at as string) : null;
  }
  // Linked resources live in a join table; the app keeps their ids on the assignment.
  for (const a of store.assignments) {
    a.resourceIds = (raw.assignment_resources ?? []).filter((r) => r.assignment_id === a.id).map((r) => r.resource_id);
  }
  return store as unknown as Store;
}

/** Throw away all demo data and reseed. Only reachable through the test hook. */
export function resetStore(): void {
  // Deep copy: some seed objects (profiles, programmes) are module-level
  // constants, so reseeding alone would hand back already-edited objects.
  globalForStore.__academeStore = structuredClone(createSeed());
}

/** A new id: readable in demo mode, a UUID for the database. */
export function newId(prefix: string): string {
  if (supabaseEnabled()) return randomUUID();
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
