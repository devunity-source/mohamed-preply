import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * Supabase client acting as the signed-in user (their session cookies, so row
 * level security applies). Only call when supabaseEnabled().
 */
export async function createClient() {
  const { url, key } = supabaseConfig()!;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) jar.set(name, value, options);
        } catch {
          // Server Components can't set cookies. src/proxy.ts refreshes the
          // session on every request, so a refresh missed here isn't lost.
        }
      },
    },
  });
}

/**
 * Admin client for inviting users. Bypasses row level security, so it only
 * ever runs inside server actions that have already checked the caller is an
 * admin. Null when SUPABASE_SECRET_KEY isn't set.
 */
export function createAdminClient() {
  const config = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret) return null;
  return createPlainClient(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
