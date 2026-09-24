import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/cookie";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { mirror, PROFILE_COLUMNS, type ProfileRow } from "@/lib/supabase/profiles";
import type { Profile } from "@/lib/types";

// Two ways to be signed in, same currentUser() / getSessionUser() for pages:
// - Supabase Auth, when the Supabase env vars are set.
// - Demo mode otherwise: server-side sessions in memory. The cookie holds a
//   random 256-bit token; the store keeps only its SHA-256, so a leaked store
//   can't be replayed as cookies.

/** The verified Supabase user and their profile. Cached for one request. */
const supabaseUser = cache(async (): Promise<{ profile: Profile; email: string } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const { data: row } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", uid).maybeSingle<ProfileRow>();
  if (!row) return null;
  return { profile: mirror(row), email: String(data.claims.email ?? "") };
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function purgeExpired(now: number) {
  const s = db();
  s.sessions = s.sessions.filter((x) => x.expiresAt.getTime() > now);
}

/** The signed-in user, or null. Never trusts anything in the cookie but the token. */
export async function getSessionUser(): Promise<Profile | null> {
  if (supabaseEnabled()) return (await supabaseUser())?.profile ?? null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const now = Date.now();
  const session = db().sessions.find((x) => x.tokenHash === hashToken(token));
  if (!session || session.expiresAt.getTime() <= now) return null;
  return db().profiles.find((p) => p.id === session.userId) ?? null;
}

/** The signed-in user; redirects to sign-in when there isn't one. */
export async function currentUser(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Demo mode: start a fresh session (call only from a server action). Any session the
 * browser already had is ended first, so a planted token can't survive sign-in.
 */
export async function startSession(userId: string): Promise<void> {
  await endSession();
  const now = Date.now();
  purgeExpired(now);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + SESSION_TTL_MS);
  db().sessions.push({ tokenHash: hashToken(token), userId, createdAt: new Date(now), expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Demo mode: end the current session server-side and clear the cookie. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const hash = hashToken(token);
    const s = db();
    s.sessions = s.sessions.filter((x) => x.tokenHash !== hash);
  }
  jar.delete({ name: SESSION_COOKIE, path: "/", secure: process.env.NODE_ENV === "production" });
}

/** Demo mode: sign the user out everywhere except this browser (after a password change). */
export async function endOtherSessions(userId: string): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const keep = token ? hashToken(token) : null;
  const s = db();
  s.sessions = s.sessions.filter((x) => x.userId !== userId || x.tokenHash === keep);
}

/**
 * Whether the signed-in user is still on an admin-issued temporary password.
 * Never with Supabase: invited people choose their own password.
 */
export function mustChangePassword(userId: string): boolean {
  if (supabaseEnabled()) return false;
  return !!db().accounts.find((a) => a.userId === userId)?.mustChangePassword;
}

/** The signed-in user's email; only ever shown to that user. */
export async function accountEmail(userId: string): Promise<string | undefined> {
  if (supabaseEnabled()) {
    const u = await supabaseUser();
    return u?.profile.id === userId ? u.email : undefined;
  }
  return db().accounts.find((a) => a.userId === userId)?.email;
}
