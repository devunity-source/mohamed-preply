import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { seedUuid } from "../../src/lib/data/seed-ids";

export const PASSWORD = process.env.E2E_DEMO_PASSWORD!;

/** True when the suite runs against a local Supabase (see playwright.config.ts). */
export const SUPABASE = !!process.env.E2E_SUPABASE_URL;

/** A seed id ("c_devops_01") as the app sees it: the same in demo mode, a stable UUID in Supabase. */
export const id = (seedId: string) => (SUPABASE ? seedUuid(seedId) : seedId);

/** Matches an id the app just created: "po_xxxx" in demo mode, a UUID in Supabase. */
export const NEW_ID = SUPABASE ? "[0-9a-f-]{36}" : "[a-z]+_[a-z0-9]+";

/** Seeded accounts, by first name. Every one signs in as <handle>@academe.demo. */
export const USERS = {
  ahmed: "ahmed", // student, DevOps #01, mid-programme
  maria: "maria", // student, DevOps #01
  sarah: "sarah", // student, DevOps #01, missing assignment 3
  rakan: "rakan", // admin, teaches DevOps #01
  samira: "samira", // instructor, AI #02 only
  yara: "yara", // graduate with a certificate
  ines: "ines", // graduate, eligible for a certificate
} as const;
export type Who = keyof typeof USERS;

/** Put the demo data back to the seed. Call before every test that changes or reads data. */
export async function resetData(request: APIRequestContext) {
  const res = await request.post("/api/test/reset", { headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET! } });
  expect(res.status(), "reset hook: is the server running with E2E_TEST_HOOKS=1?").toBe(200);
  if (SUPABASE) await request.delete(`${process.env.E2E_MAILPIT_URL}/api/v1/messages`);
}

export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag: string;
  headers?: Record<string, string>;
}

/** Emails the app "sent" since the last reset (the test outbox; nothing leaves the machine). */
export async function sentEmails(request: APIRequestContext, to?: string): Promise<SentEmail[]> {
  const res = await request.get("/api/test/outbox", { headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET! } });
  expect(res.status(), "outbox hook").toBe(200);
  const all = (await res.json()) as SentEmail[];
  return to ? all.filter((e) => e.to === to) : all;
}

/** Runs the class reminder job, as the scheduler would. */
export async function runClassReminders(request: APIRequestContext) {
  const res = await request.get("/api/cron/class-reminders", {
    headers: { authorization: `Bearer ${process.env.E2E_CRON_SECRET}` },
  });
  expect(res.status(), "class reminder job").toBe(200);
  return (await res.json()) as { classes: number; reminders: number };
}

/**
 * Supabase mode: the link in the newest email to `to`, from the local stack's
 * mail catcher (Mailpit). Waits for it to arrive.
 */
export async function emailLink(request: APIRequestContext, to: string): Promise<string> {
  const base = process.env.E2E_MAILPIT_URL!;
  const find = async () => {
    const res = await request.get(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    return ((await res.json()).messages ?? [])[0]?.ID as string | undefined;
  };
  await expect.poll(find, { message: `an email to ${to}`, timeout: 15_000 }).toBeTruthy();
  const message = await (await request.get(`${base}/api/v1/message/${await find()}`)).json();
  const href = String(message.HTML).match(/href="([^"]+)"/)?.[1];
  expect(href, "a link in the email").toBeTruthy();
  return href!.replaceAll("&amp;", "&");
}

export async function signIn(page: Page, who: Who, password = PASSWORD) {
  await page.goto("/login");
  // By field name, so it works whichever language the page is in.
  const form = page.locator("form").filter({ has: page.locator('input[name="password"]') });
  await form.locator('input[name="email"]').fill(`${USERS[who]}@academe.demo`);
  await form.locator('input[name="password"]').fill(password);
  await form.locator("button").last().click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * The suite's `test`: adds `as(who)` for a second, independent signed-in
 * browser (checks between two people) and `anon()` for a signed-out one.
 * Both close their windows when the test ends.
 */
export const test = base.extend<{ as: (who: Who) => Promise<Page>; anon: () => Promise<Page> }>({
  as: async ({ browser }, provide) => {
    const opened: BrowserContext[] = [];
    await provide(async (who) => {
      const context = await browser.newContext();
      opened.push(context);
      const page = await context.newPage();
      await signIn(page, who);
      return page;
    });
    await Promise.all(opened.map((c) => c.close()));
  },
  anon: async ({ browser }, provide) => {
    const opened: BrowserContext[] = [];
    await provide(async () => {
      const context = await browser.newContext();
      opened.push(context);
      return context.newPage();
    });
    await Promise.all(opened.map((c) => c.close()));
  },
});

export { expect };

export const main = (page: Page) => page.locator("main");

/** The page doesn't scroll sideways at the current viewport. */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, view } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: window.innerWidth,
  }));
  expect(scroll, `page is ${scroll}px wide in a ${view}px window`).toBeLessThanOrEqual(view);
}

/** Today's weekday in the academy timezone, 0 = Monday. */
export function academyWeekday(date = new Date()) {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dubai", weekday: "short" }).format(date);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short);
}
