import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/auth/config";
import type { EmailKind } from "@/lib/types";

// Unsubscribe links carry a signature, so nobody can turn off someone else's
// emails by editing the link. The key is derived from the Resend key (no
// Resend key, no emails, so no links to check); tests use their own secret.

function key(): string {
  return (
    process.env.RESEND_API_KEY ||
    (process.env.E2E_TEST_HOOKS === "1" ? process.env.E2E_TEST_SECRET : "") ||
    "academe-dev-email-links"
  );
}

function sign(userId: string, kind: EmailKind): string {
  return createHmac("sha256", key()).update(`unsubscribe:${userId}:${kind}`).digest("base64url").slice(0, 32);
}

export function validUnsubscribe(userId: string, kind: string, token: string): kind is EmailKind {
  if (!["grades", "community", "office_hours", "reminders"].includes(kind)) return false;
  const expected = Buffer.from(sign(userId, kind as EmailKind));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function unsubscribeLinks(userId: string, kind: EmailKind) {
  const q = new URLSearchParams({ u: userId, k: kind, t: sign(userId, kind) });
  return {
    /** A page with a button, so link scanners can't unsubscribe anyone. */
    page: `${siteUrl()}/email/unsubscribe?${q}`,
    /** RFC 8058 one-click, for the mail app's own unsubscribe button. */
    oneClick: `${siteUrl()}/email/unsubscribe/one-click?${q}`,
  };
}
