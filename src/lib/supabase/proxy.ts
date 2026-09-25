import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTIONS, supabaseConfig } from "./config";

type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

/**
 * Refreshes the Supabase session for this request. Expired access tokens are
 * swapped for new ones here, because Server Components can't write cookies.
 * The new values are written into the request (so this render sees them) and
 * returned so the caller can copy them onto its response.
 */
export async function refreshSession(request: NextRequest): Promise<{ signedIn: boolean; cookies: CookieToSet[] }> {
  const { url, key } = supabaseConfig()!;
  const refreshed: CookieToSet[] = [];
  const supabase = createServerClient(url, key, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const c of toSet) {
          request.cookies.set(c.name, c.value);
          refreshed.push(c);
        }
      },
    },
  });
  // getClaims verifies the token (and refreshes it when expired). Don't put
  // other code between creating the client and this call.
  const { data } = await supabase.auth.getClaims();
  return { signedIn: !!data?.claims?.sub, cookies: refreshed };
}
