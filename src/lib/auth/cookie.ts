// Shared by src/proxy.ts and the server session code, so no server-only import.

// __Host- makes the browser refuse the cookie unless it's Secure, has no
// Domain and has Path=/, so a subdomain can't plant or overwrite it.
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-academe_session" : "academe_session";

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** Paths that need a signed-in user. Everything else (/, /verify, /login) is public. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/programmes",
  "/cohorts",
  "/community",
  "/calendar",
  "/resources",
  "/notifications",
  "/profile",
  "/admin",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
