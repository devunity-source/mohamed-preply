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

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
