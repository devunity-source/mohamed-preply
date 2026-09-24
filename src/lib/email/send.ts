import "server-only";
import { after } from "next/server";
import type { Rendered } from "./templates";

// Sends through Resend's API, after the response has gone out, so nobody
// waits on email. Without RESEND_API_KEY emails are logged and skipped. With
// the test hooks on (browser tests), they go to an in-memory outbox instead
// and never leave the machine.

export interface OutgoingEmail extends Rendered {
  to: string;
  /** Resend tag, for filtering in their dashboard. */
  tag: string;
  headers?: Record<string, string>;
  /** Resend drops a repeat with the same key within 24 hours. */
  idempotencyKey?: string;
}

const g = globalThis as unknown as { __academeOutbox?: OutgoingEmail[] };
const testHooks = () => process.env.E2E_TEST_HOOKS === "1";

export const outbox = () => (g.__academeOutbox ??= []);
export const clearOutbox = () => void (g.__academeOutbox = []);

/** The test sender until a domain is verified in Resend; see docs/email-setup.md. */
export const sender = () => process.env.EMAIL_FROM || "AcadeMe <onboarding@resend.dev>";

/** Sends right away. The app uses sendLater(); this is for scripts. */
export async function deliver(e: OutgoingEmail): Promise<void> {
  if (testHooks()) {
    outbox().push(e);
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`Email not sent (no RESEND_API_KEY): "${e.subject}" to ${e.to}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(e.idempotencyKey ? { "Idempotency-Key": e.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: sender(),
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      headers: e.headers,
      tags: [{ name: "type", value: e.tag }],
    }),
  });
  if (!res.ok) throw new Error(`Email "${e.subject}" to ${e.to} failed: ${res.status} ${await res.text()}`);
}

// One at a time with a short gap: Resend allows 10 requests a second.
let queue: Promise<void> = Promise.resolve();
const GAP_MS = 150;

/**
 * Builds and sends an email after the response. `build` runs later too, so
 * it can look things up (like the recipient's address) without slowing the
 * page; returning null sends nothing. Failures are logged, never thrown.
 */
export function sendLater(build: () => Promise<OutgoingEmail | null>): void {
  after(() => {
    queue = queue
      .then(async () => {
        const email = await build();
        if (email) await deliver(email);
      })
      .catch((err) => console.error(`Email not sent: ${err instanceof Error ? err.message : err}`))
      .then(() => new Promise((r) => setTimeout(r, GAP_MS)));
    return queue;
  });
}
