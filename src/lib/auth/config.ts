import "server-only";

/**
 * One-click demo sign-in (pick any seeded account, including the admin).
 * On by default only in development; a deployment must opt in explicitly with
 * DEMO_LOGIN=true, and should only do that for throwaway demo instances.
 */
export function demoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_LOGIN === "true";
}

/**
 * Password for the seeded demo accounts. Defaults to "academe-demo" in
 * development. In production the seeded accounts get no password (so nobody
 * can sign in as them) unless DEMO_PASSWORD is set.
 */
export function demoPassword(): string | undefined {
  return process.env.DEMO_PASSWORD || (process.env.NODE_ENV !== "production" ? "academe-demo" : undefined);
}
