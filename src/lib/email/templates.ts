import "server-only";
import { siteUrl } from "@/lib/auth/config";

// Plain, fast-loading emails: one message, one button, a footer. Inline
// styles only (mail apps ignore stylesheets). Evening palette: Dusk, Lamp.

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

function layout(o: {
  heading: string;
  body: string;
  button?: { label: string; href: string };
  footer: string;
}): string {
  const button = o.button
    ? `<p style="margin:28px 0"><a href="${esc(o.button.href)}" style="background:#F2B33D;color:#15181F;padding:12px 20px;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block">${esc(o.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F3F5F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15181F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#1F2A44;color:#F3F5F7;padding:18px 24px;border-radius:8px 8px 0 0;font-weight:700;font-size:18px">AcadeMe</td></tr>
<tr><td style="background:#ffffff;padding:28px 24px;border:1px solid #D5DAE2;border-top:0;border-radius:0 0 8px 8px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${esc(o.heading)}</h1>
<div style="font-size:15px;line-height:1.6;color:#15181F">${o.body}</div>${button}
</td></tr>
<tr><td style="padding:16px 8px;font-size:12px;line-height:1.5;color:#5B6475">${o.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

/** An in-app notification, sent as email too. */
export function activityEmail(o: {
  firstName: string;
  text: string;
  href: string;
  why: string;
  unsubscribe?: string;
}): Rendered {
  const url = `${siteUrl()}${o.href}`;
  const settings = `${siteUrl()}/profile#email`;
  const off = o.unsubscribe
    ? ` <a href="${esc(o.unsubscribe)}" style="color:#5B6475">Stop these emails</a> or <a href="${esc(settings)}" style="color:#5B6475">choose which you get</a>.`
    : ` <a href="${esc(settings)}" style="color:#5B6475">Email settings</a>.`;
  return {
    subject: o.text,
    html: layout({
      heading: o.text,
      body: `<p style="margin:0">Hi ${esc(o.firstName)}, this is also in your notifications on AcadeMe.</p>`,
      button: { label: "Open in AcadeMe", href: url },
      footer: `${esc(o.why)}${off}`,
    }),
    text: `Hi ${o.firstName},\n\n${o.text}\n\nOpen in AcadeMe: ${url}\n\n${o.why} ${o.unsubscribe ? `Stop these emails: ${o.unsubscribe}` : `Email settings: ${settings}`}\n`,
  };
}

export function waitlistEmail(programme: string): Rendered {
  const url = `${siteUrl()}/#programmes`;
  return {
    subject: `You're on the waitlist for ${programme}`,
    html: layout({
      heading: "You're on the list",
      body: `<p style="margin:0 0 12px">Thanks for joining the waitlist for <strong>${esc(programme)}</strong>.</p><p style="margin:0">We'll email you before enrolment opens for the next cohort, with dates and the price. That's it: no newsletter.</p>`,
      button: { label: "See the programme", href: url },
      footer:
        "You're getting this because this address joined the AcadeMe waitlist. If that wasn't you, ignore this email and you won't hear from us.",
    }),
    text: `You're on the waitlist for ${programme}.\n\nWe'll email you before enrolment opens for the next cohort, with dates and the price. No newsletter.\n\n${url}\n\nIf that wasn't you, ignore this email.\n`,
  };
}

export function classReminderEmail(o: {
  firstName: string;
  title: string;
  when: string;
  href: string;
  unsubscribe: string;
}): Rendered {
  const url = `${siteUrl()}${o.href}`;
  return {
    subject: `Class at ${o.when}: ${o.title}`,
    html: layout({
      heading: `${o.title} starts at ${o.when}`,
      body: `<p style="margin:0">Hi ${esc(o.firstName)}, your live class is coming up. The join link opens a few minutes before the start.</p>`,
      button: { label: "Go to the class", href: url },
      footer: `A reminder before each live class. <a href="${esc(o.unsubscribe)}" style="color:#5B6475">Stop reminders</a>.`,
    }),
    text: `Hi ${o.firstName},\n\n${o.title} starts at ${o.when}.\n\n${url}\n\nStop reminders: ${o.unsubscribe}\n`,
  };
}
