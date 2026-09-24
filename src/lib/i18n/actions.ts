"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, withData } from "@/lib/data/store";
import { update } from "@/lib/data/save";
import { getSessionUser } from "@/lib/session";
import { isLocale, LOCALE_COOKIE } from "./config";

/** The language toggle: remembered on this device and, when signed in, on the profile (emails use it). */
export const setLocale = withData(async (locale: string) => {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  const user = await getSessionUser();
  const profile = user && db().profiles.find((p) => p.id === user.id);
  if (profile && profile.locale !== locale) await update("profiles", profile, { locale });
  revalidatePath("/", "layout");
});
