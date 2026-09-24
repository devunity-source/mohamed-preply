import "server-only";
import { db } from "@/lib/data/store";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";
import type { EmailKind } from "@/lib/types";

export const EMAIL_KINDS: { kind: EmailKind; label: string; hint: string; noun: string }[] = [
  {
    kind: "grades",
    label: "Grades and certificates",
    hint: "Work graded, labs reviewed, certificates issued",
    noun: "grade and certificate",
  },
  {
    kind: "community",
    label: "Mentions and comments",
    hint: "Someone @mentions you or comments on your post",
    noun: "mention and comment",
  },
  { kind: "office_hours", label: "Office hours", hint: "Messages and replies", noun: "office hours" },
  { kind: "reminders", label: "Reminders", hint: "Before live classes, and for work that's missing", noun: "reminder" },
];

/** "reminder", as in "Stop reminder emails". */
export const kindNoun = (kind: EmailKind) => EMAIL_KINDS.find((k) => k.kind === kind)!.noun;

/** The signed-in person's own settings (their row is in this request's data). */
export function emailOff(userId: string): EmailKind[] {
  return db().emailPrefs.find((p) => p.userId === userId)?.off ?? [];
}

/**
 * Turns one kind off from an unsubscribe link: no one is signed in, so with
 * Supabase this uses the secret key. Callers check the link's signature first.
 */
export async function turnOffFromLink(userId: string, kind: EmailKind): Promise<void> {
  if (!supabaseEnabled()) {
    const s = db();
    if (!s.profiles.some((p) => p.id === userId)) return;
    const row = s.emailPrefs.find((p) => p.userId === userId);
    if (!row) s.emailPrefs.push({ userId, off: [kind] });
    else if (!row.off.includes(kind)) row.off.push(kind);
    return;
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SECRET_KEY is needed");
  const { data } = await admin.from("email_preferences").select("off").eq("user_id", userId).maybeSingle();
  const off = [...new Set([...((data?.off ?? []) as EmailKind[]), kind])];
  const { error } = await admin.from("email_preferences").upsert({ user_id: userId, off });
  // A deleted account has no profile to hang settings on; nothing to do.
  if (error && !/foreign key/i.test(error.message)) throw new Error(error.message);
}
