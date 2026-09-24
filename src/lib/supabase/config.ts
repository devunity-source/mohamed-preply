// Shared by src/proxy.ts and server code, so no server-only import.

/**
 * Supabase settings, or null for demo mode. Demo mode (sign-in and data held
 * in memory) runs whenever either value is missing, which keeps local
 * development and the automated tests off the real project.
 */
export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export const supabaseEnabled = () => supabaseConfig() !== null;

/**
 * Auth cookies are HttpOnly: only the server reads them (the app has no
 * browser-side Supabase client), so page scripts never can. @supabase/ssr
 * leaves them readable by default for its browser client.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;
