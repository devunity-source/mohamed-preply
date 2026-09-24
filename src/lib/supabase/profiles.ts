import "server-only";
import { db } from "@/lib/data/store";
import type { Profile, Role } from "@/lib/types";

export const PROFILE_COLUMNS = "id, full_name, handle, role, headline, avatar_color, onboarded_at";

export interface ProfileRow {
  id: string;
  full_name: string;
  handle: string;
  role: Role;
  headline: string;
  avatar_color: string;
  onboarded_at: string | null;
}

/**
 * Copies a Supabase profile into the in-memory store, where the rest of the
 * app still reads its data until that moves to Supabase too.
 */
export function mirror(row: ProfileRow): Profile {
  const fields = {
    fullName: row.full_name,
    handle: row.handle,
    role: row.role,
    headline: row.headline,
    avatarColor: row.avatar_color,
  };
  const existing = db().profiles.find((p) => p.id === row.id);
  if (existing) return Object.assign(existing, fields);
  const profile: Profile = { id: row.id, ...fields, onboardedAt: row.onboarded_at ? new Date(row.onboarded_at) : null };
  db().profiles.push(profile);
  return profile;
}
