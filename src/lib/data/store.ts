import "server-only";
import { createSeed, type Store } from "./seed";

// Demo mode: an in-memory store seeded relative to server start. It lives on
// globalThis so it survives hot reloads in dev. Writes persist until the
// server restarts. Replaced by Supabase in Phase 2 (see PROGRESS.md).
const globalForStore = globalThis as unknown as { __academeStore?: Store };

export function db(): Store {
  globalForStore.__academeStore ??= createSeed();
  return globalForStore.__academeStore;
}

/** Throw away all demo data and reseed. Only reachable through the test hook. */
export function resetStore(): void {
  // Deep copy: some seed objects (profiles, programmes) are module-level
  // constants, so reseeding alone would hand back already-edited objects.
  globalForStore.__academeStore = structuredClone(createSeed());
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
