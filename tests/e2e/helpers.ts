import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = process.env.E2E_DEMO_PASSWORD!;

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
}

export async function signIn(page: Page, who: Who, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${USERS[who]}@academe.demo`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
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
