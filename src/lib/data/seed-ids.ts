import { createHash } from "node:crypto";

// Seed data uses readable ids ("c_devops_01"); database ids are UUIDs. This
// turns a seed id into the same UUID every time, so seed scripts and tests
// agree on ids without looking them up. No server-only import: the browser
// tests use it too.

export function seedUuid(id: string): string {
  const h = createHash("sha1").update(`academe-seed:${id}`).digest("hex");
  // Shaped like a version 5 UUID.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
