import "server-only";
import { db } from "@/lib/data/store";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";
import type { Key } from "@/lib/i18n/translate";
import type { EmailKind } from "@/lib/types";

/** The kinds people can switch off, with message keys for their label, hint and "Stop X emails" noun. */
export const EMAIL_KINDS: { kind: EmailKind; label: Key; hint: Key; noun: Key }[] = [
  { kind: "grades", label: "email.kindGrades", hint: "email.kindGradesHint", noun: "email.kindGradesNoun" },
  { kind: "community", label: "email.kindCommunity", hint: "email.kindCommunityHint", noun: "email.kindCommunityNoun" },
  {
    kind: "office_hours",
    label: "email.kindOfficeHours",
    hint: "email.kindOfficeHoursHint",
    noun: "email.kindOfficeHoursNoun",
  },
  { kind: "reminders", label: "email.kindReminders", hint: "email.kindRemindersHint", noun: "email.kindRemindersNoun" },
];

/** The message key for "reminder", as in "Stop reminder emails". */
export const kindNoun = (kind: EmailKind): Key => EMAIL_KINDS.find((k) => k.kind === kind)!.noun;

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
