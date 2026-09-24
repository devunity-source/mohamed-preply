import "server-only";
import { db } from "@/lib/data/store";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";
import { unsubscribeLinks } from "./links";
import { sendLater } from "./send";
import { activityEmail } from "./templates";
import { isLocale, type Locale } from "@/lib/i18n/config";
import type { Key } from "@/lib/i18n/translate";
import type { Vars } from "@/lib/i18n/format";
import type { EmailKind } from "@/lib/types";

export type ActivityKind = EmailKind | "cohort";

const WHY: Record<ActivityKind, Key> = {
  grades: "email.whyGrades",
  community: "email.whyCommunity",
  office_hours: "email.whyOfficeHours",
  reminders: "email.whyReminders",
  cohort: "email.whyCohort",
};

export interface Recipient {
  email: string;
  firstName: string;
  off: EmailKind[];
  /** Their saved language; English if they never picked one. */
  locale: Locale;
}

/**
 * Who to email and what they turned off. Demo mode knows now. With Supabase
 * the person acting can't read someone else's address or settings (and
 * shouldn't), so the server looks them up with the secret key, later, when
 * the email is built.
 */
export function recipient(userId: string): () => Promise<Recipient | null> {
  const s = db();
  const profile = s.profiles.find((p) => p.id === userId);
  const firstName = profile?.fullName.split(" ")[0] ?? "";
  const locale: Locale = isLocale(profile?.locale) ? profile.locale : "en";
  if (!supabaseEnabled()) {
    const email = s.accounts.find((a) => a.userId === userId)?.email;
    const off = s.emailPrefs.find((p) => p.userId === userId)?.off ?? [];
    return async () => (email ? { email, firstName, off, locale } : null);
  }
  return async () => {
    const admin = createAdminClient();
    if (!admin) throw new Error("SUPABASE_SECRET_KEY is needed to look up email addresses");
    const [{ data: user }, { data: prefs }] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("email_preferences").select("off").eq("user_id", userId).maybeSingle(),
    ]);
    const email = user?.user?.email;
    return email ? { email, firstName, off: (prefs?.off ?? []) as EmailKind[], locale } : null;
  };
}

/** Emails an in-app notification in the person's language, unless they turned that kind off. */
export function emailActivity(userId: string, template: Key, params: Vars, href: string, kind: ActivityKind): void {
  const who = recipient(userId);
  sendLater(async () => {
    const r = await who();
    if (!r || (kind !== "cohort" && r.off.includes(kind))) return null;
    const links = kind === "cohort" ? null : unsubscribeLinks(userId, kind);
    return {
      to: r.email,
      tag: kind,
      ...activityEmail({
        locale: r.locale,
        firstName: r.firstName,
        template,
        params,
        href,
        why: WHY[kind],
        unsubscribe: links?.page,
      }),
      headers: links
        ? { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    };
  });
}
