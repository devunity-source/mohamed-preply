import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath, SESSION_COOKIE } from "@/lib/auth/cookie";

// Per-request nonce Content Security Policy. Next.js reads the nonce from the
// request's CSP header and applies it to its own scripts. Styles keep
// 'unsafe-inline' because components use inline style attributes (avatar
// colours), which nonces cannot cover.
export function proxy(request: NextRequest) {
  // Optimistic auth gate: no session cookie, no app. The authoritative check
  // (is the token real and unexpired?) is currentUser() on the server, which
  // also covers prefetches that skip this proxy.
  const { pathname, search } = request.nextUrl;
  if (isProtectedPath(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
