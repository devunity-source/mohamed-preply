import "server-only";
import { siteUrl } from "@/lib/auth/config";
import { dirOf, type Locale } from "@/lib/i18n/config";
import { translate, type Key } from "@/lib/i18n/translate";
import type { Vars } from "@/lib/i18n/format";

// Plain, fast-loading emails: one message, one button, a footer, in the
// recipient's language (right to left for Arabic). Inline styles only (mail
// apps ignore stylesheets). Evening palette: Dusk, Lamp.

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,Tahoma,sans-serif";
const link = (href: string, label: string) => `<a href="${esc(href)}" style="color:#5B6475">${esc(label)}</a>`;

function layout(
  locale: Locale,
  o: { heading: string; body: string; button?: { label: string; href: string }; footer: string },
): string {
  const dir = dirOf(locale);
  const align = dir === "rtl" ? "right" : "left";
  const button = o.button
    ? `<p style="margin:28px 0"><a href="${esc(o.button.href)}" style="background:#F2B33D;color:#15181F;padding:12px 20px;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block">${esc(o.button.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#F3F5F7;font-family:${FONT};color:#15181F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px" dir="${dir}">
<tr><td style="background:#1F2A44;color:#F3F5F7;padding:18px 24px;border-radius:8px 8px 0 0;font-weight:700;font-size:18px;text-align:${align}">AcadeMe</td></tr>
<tr><td style="background:#ffffff;padding:28px 24px;border:1px solid #D5DAE2;border-top:0;border-radius:0 0 8px 8px;text-align:${align}">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.4">${esc(o.heading)}</h1>
<div style="font-size:15px;line-height:1.7;color:#15181F">${o.body}</div>${button}
</td></tr>
<tr><td style="padding:16px 8px;font-size:12px;line-height:1.6;color:#5B6475;text-align:${align}">${o.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

/** An in-app notification, sent as email too, in the recipient's language. */
export function activityEmail(o: {
  locale: Locale;
  firstName: string;
  template: Key;
  params: Vars;
  href: string;
  why: Key;
  unsubscribe?: string;
}): Rendered {
  const t = (key: Key, vars?: Vars) => translate(o.locale, key, vars);
  const text = t(o.template, o.params);
  const url = `${siteUrl()}${o.href}`;
  const settings = `${siteUrl()}/profile#email`;
  const off = o.unsubscribe
    ? t("email.stopOr")
        .replace(/<stop>(.*?)<\/stop>/, (_, label) => link(o.unsubscribe!, label))
        .replace(/<choose>(.*?)<\/choose>/, (_, label) => link(settings, label))
    : link(settings, t("email.settings"));
  return {
    subject: text,
    html: layout(o.locale, {
      heading: text,
      body: `<p style="margin:0">${esc(t("email.alsoInApp", { name: o.firstName }))}</p>`,
      button: { label: t("email.open"), href: url },
      footer: `${esc(t(o.why))} ${off}`,
    }),
    text: `${t("email.hi", { name: o.firstName })}\n\n${text}\n\n${t("email.open")}: ${url}\n\n${t(o.why)} ${o.unsubscribe ? `${t("email.stop")}: ${o.unsubscribe}` : `${t("email.settings")}: ${settings}`}\n`,
  };
}

export function waitlistEmail(programme: string, locale: Locale = "en"): Rendered {
  const t = (key: Key, vars?: Vars) => translate(locale, key, vars);
  const url = `${siteUrl()}/#programmes`;
  return {
    subject: t("email.waitlistSubject", { programme }),
    html: layout(locale, {
      heading: t("email.waitlistHeading"),
      body: `<p style="margin:0 0 12px">${esc(t("email.waitlistThanks", { programme }))}</p><p style="margin:0">${esc(t("email.waitlistNext"))}</p>`,
      button: { label: t("email.waitlistButton"), href: url },
      footer: esc(t("email.waitlistWhy")),
    }),
    text: `${t("email.waitlistThanks", { programme })}\n\n${t("email.waitlistNext")}\n\n${url}\n\n${t("email.waitlistWhy")}\n`,
  };
}

export function classReminderEmail(o: {
  locale: Locale;
  firstName: string;
  title: string;
  when: string;
  href: string;
  unsubscribe: string;
}): Rendered {
  const t = (key: Key, vars?: Vars) => translate(o.locale, key, vars);
  const url = `${siteUrl()}${o.href}`;
  const v = { title: o.title, time: o.when, name: o.firstName };
  return {
    subject: t("email.reminderSubject", v),
    html: layout(o.locale, {
      heading: t("email.reminderHeading", v),
      body: `<p style="margin:0">${esc(t("email.reminderBody", v))}</p>`,
      button: { label: t("email.reminderButton"), href: url },
      footer: `${esc(t("email.reminderWhy"))} ${link(o.unsubscribe, t("email.stopReminders"))}`,
    }),
    text: `${t("email.hi", v)}\n\n${t("email.reminderHeading", v)}\n\n${url}\n\n${t("email.stopReminders")}: ${o.unsubscribe}\n`,
  };
}
