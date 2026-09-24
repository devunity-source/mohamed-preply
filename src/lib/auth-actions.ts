"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import { demoLoginEnabled, siteUrl } from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isInternalPath } from "@/lib/paths";
import { isLimited, recordFailure } from "@/lib/rate-limit";
import { accountEmail, currentUser, endOtherSessions, endSession, getSessionUser, startSession } from "@/lib/session";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
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

  if (!(await passwordMatches(email, password))) {
    recordFailure(ipKey, WINDOW);
    recordFailure(emailKey, WINDOW);
    return { error: BAD_LOGIN };
  }
  redirect(safeNext(form.get("next")));
}

/**
 * Checks the password and, when it's right, signs in (a fresh session either
 * way: Supabase issues new tokens, demo mode replaces any planted cookie).
 */
async function passwordMatches(email: string, password: string): Promise<boolean> {
  if (supabaseEnabled()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }
  const account = db().accounts.find((a) => a.email === email);
  // Always run the hash, even for unknown emails, so timing doesn't leak which exist.
  const ok = await verifyPassword(password, account?.passwordHash ?? null);
  if (!account || !ok) return false;
  await startSession(account.userId);
  return true;
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
  if (supabaseEnabled()) await (await createClient()).auth.signOut();
  else await endSession();
  redirect("/login");
}

const MIN_PASSWORD = 10;

/**
 * Change your own password. Needs the current one (so a borrowed, signed-in
 * laptop isn't enough), limits wrong guesses, and signs out every other
 * session so an old password can't keep someone logged in elsewhere.
 */
export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  const current = String(form.get("current") ?? "").slice(0, 200);
  const next = String(form.get("next") ?? "").slice(0, 200);
  const confirm = String(form.get("confirm") ?? "").slice(0, 200);

  const key = `change-password:${user.id}`;
  if (isLimited(key, 5)) return { error: "Too many wrong attempts. Wait 15 minutes and try again." };
  if (!(await currentPasswordMatches(user.id, current))) {
    recordFailure(key, WINDOW);
    return { error: "Your current password is incorrect." };
  }
  const invalid = newPasswordProblem(next, confirm);
  if (invalid) return { error: invalid };
  if (next === current) return { error: "Pick a password that's different from the current one." };

  if (supabaseEnabled()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { error: supabaseProblem(error.message) };
    await supabase.auth.signOut({ scope: "others" });
  } else {
    const account = db().accounts.find((a) => a.userId === user.id)!;
    account.passwordHash = await hashPassword(next);
    account.mustChangePassword = false;
    await endOtherSessions(user.id);
  }
  return { ok: true };
}

async function currentPasswordMatches(userId: string, password: string): Promise<boolean> {
  if (supabaseEnabled()) {
    // Signing in again is how Supabase checks a password. It's the same
    // person, so the only effect is fresh tokens for this browser.
    const email = await accountEmail(userId);
    if (!email) return false;
    const { error } = await (await createClient()).auth.signInWithPassword({ email, password });
    return !error;
  }
  const account = db().accounts.find((a) => a.userId === userId);
  return !!account && (await verifyPassword(password, account.passwordHash));
}

function newPasswordProblem(next: string, confirm: string): string | null {
  if (next.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for the new password.`;
  if (next !== confirm) return "The new passwords don't match.";
  return null;
}

/** Supabase's own password rules (set in its dashboard) can reject one too. */
function supabaseProblem(message: string): string {
  return /password/i.test(message) ? message : "Couldn't save the new password. Try again.";
}

const RESET_SENT = "If there's an account for that email, a reset link is on its way. It works once, for one hour.";

/**
 * Emails a password reset link (Supabase only). Same answer whether or not
 * the email has an account, so it can't be used to find out who's enrolled.
 */
export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  if (!supabaseEnabled()) return { error: "Password reset needs email, which isn't set up here. Ask an admin." };
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const ipKey = `reset-ip:${await clientIp()}`;
  const emailKey = `reset-email:${email}`;
  if (isLimited(ipKey, 10) || isLimited(emailKey, 3)) {
    return { error: "Too many requests. Wait 15 minutes and try again." };
  }
  recordFailure(ipKey, WINDOW);
  recordFailure(emailKey, WINDOW);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?type=recovery&next=/set-password`,
  });
  return { ok: true, message: RESET_SENT };
}

/**
 * Sets a new password after following a reset or invite link, which signs
 * the person in first. Doesn't ask for the old password: the link proved
 * they own the email.
 */
export async function setNewPassword(_prev: FormState, form: FormData): Promise<FormState> {
  if (!supabaseEnabled() || !(await getSessionUser())) {
    return { error: "This link has expired. Ask for a new one from the sign-in page." };
  }
  const next = String(form.get("next") ?? "").slice(0, 200);
  const invalid = newPasswordProblem(next, String(form.get("confirm") ?? "").slice(0, 200));
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: supabaseProblem(error.message) };
  await supabase.auth.signOut({ scope: "others" });
  redirect("/dashboard");
}

// Only the emails this app sends: invites and password resets.
const LINK_TYPES: readonly EmailOtpType[] = ["invite", "recovery"];

/**
 * Swaps the one-time token from an invite or reset email for a session, then
 * continues to `next`, which must be a path inside the app so a crafted link
 * can't bounce people to another site.
 */
export async function confirmEmailLink(form: FormData) {
  const field = (k: string) => String(form.get(k) ?? "").slice(0, 2000);
  const nextParam = field("next");
  const next = isInternalPath(nextParam) ? nextParam : "/dashboard";
  if (!supabaseEnabled()) redirect("/login?link=expired");

  const supabase = await createClient();
  const tokenHash = field("token_hash");
  const type = field("type") as EmailOtpType;
  const code = field("code");
  let ok = false;
  if (tokenHash && LINK_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  redirect(ok ? next : "/login?link=expired");
}
