import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/cookie";
import type { Profile } from "@/lib/types";

// Server-side sessions. The cookie holds a random 256-bit token; the store
// keeps only its SHA-256, so a leaked store can't be replayed as cookies.
// Phase 2 replaces this module with Supabase Auth behind the same
// currentUser() / getSessionUser() functions.

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function purgeExpired(now: number) {
  const s = db();
  s.sessions = s.sessions.filter((x) => x.expiresAt.getTime() > now);
}

/** The signed-in user, or null. Never trusts anything in the cookie but the token. */
export async function getSessionUser(): Promise<Profile | null> {
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
 * Start a fresh session (call only from a server action). Any session the
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

/** End the current session server-side and clear the cookie. */
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

/** The sign-in email for a user; only ever shown to that user. */
export function accountEmail(userId: string): string | undefined {
  return db().accounts.find((a) => a.userId === userId)?.email;
}
