import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/data/store";
import { DEMO_USER_ID } from "@/lib/data/seed";
import type { Profile } from "@/lib/types";

export const SESSION_COOKIE = "academe_uid";

// Demo auth: the signed-in user is whoever the cookie names, defaulting to the
// demo student. Phase 2 swaps this for Supabase Auth.
export async function currentUser(): Promise<Profile> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value ?? DEMO_USER_ID;
  const { profiles } = db();
  return profiles.find((p) => p.id === id) ?? profiles.find((p) => p.id === DEMO_USER_ID)!;
}
