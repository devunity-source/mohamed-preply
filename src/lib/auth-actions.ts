"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import { demoLoginEnabled } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { isInternalPath } from "@/lib/paths";
import { isLimited, recordFailure } from "@/lib/rate-limit";
import { endSession, startSession } from "@/lib/session";
import type { FormState } from "@/lib/actions";

const WINDOW = 15 * 60_000;
// One message for every failure so the form can't be used to find out which
// emails have accounts.
const BAD_LOGIN = "Email or password is incorrect.";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next && isInternalPath(next) && !next.startsWith("/login") ? next : "/dashboard";
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!email || !password) return { error: "Enter your email and password." };

  // Failed attempts only: per IP slows password spraying, per email slows
  // guessing one account. Signing in successfully never counts against you.
  const ipKey = `login-ip:${await clientIp()}`;
  const emailKey = `login-email:${email}`;
  if (isLimited(ipKey, 20) || isLimited(emailKey, 5)) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }

  const account = db().accounts.find((a) => a.email === email);
  // Always run the hash, even for unknown emails, so timing doesn't leak which exist.
  const ok = await verifyPassword(password, account?.passwordHash ?? null);
  if (!account || !ok) {
    recordFailure(ipKey, WINDOW);
    recordFailure(emailKey, WINDOW);
    return { error: BAD_LOGIN };
  }

  await startSession(account.userId);
  redirect(safeNext(form.get("next")));
}

/** Development only (or DEMO_LOGIN=true): sign in as a seeded account without a password. */
export async function demoSignIn(userId: string) {
  if (!demoLoginEnabled()) throw new Error("Demo sign-in is disabled");
  if (typeof userId !== "string" || !db().profiles.some((p) => p.id === userId)) throw new Error("Not found");
  await startSession(userId);
  redirect("/dashboard");
}

/** Form variant of demoSignIn for the profile page's account picker. */
export async function demoSignInForm(form: FormData) {
  await demoSignIn(String(form.get("userId") ?? ""));
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
