import { expect, id, main, resetData, sentEmails, signIn, test } from "./helpers";

// The Arabic version: the toggle, where the choice is remembered, right to
// left, Arabic content and dates, and emails in each person's language.

test.beforeEach(async ({ request }) => resetData(request));

const ARABIC = /[؀-ۿ]/;
const ARABIC_INDIC_DIGITS = /[٠-٩]/;
const htmlLang = (page: import("@playwright/test").Page) =>
  page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);

test("the toggle switches the landing page to Arabic, right to left, and remembers it", async ({ page }) => {
  await page.goto("/");
  expect(await htmlLang(page)).toEqual(["en", "ltr"]);
  await page.getByRole("button", { name: /العربية/ }).click();
  await expect.poll(() => htmlLang(page)).toEqual(["ar", "rtl"]);
  await expect(page.locator("h1").first()).toHaveText(ARABIC);
  await page.reload();
  expect(await htmlLang(page)).toEqual(["ar", "rtl"]);

  await page.getByRole("button", { name: /English/ }).click();
  await expect.poll(() => htmlLang(page)).toEqual(["en", "ltr"]);
});

test("a browser set to Arabic gets Arabic on its first visit", async ({ browser }) => {
  const context = await browser.newContext({ locale: "ar-AE" });
  const page = await context.newPage();
  await page.goto("/");
  expect(await htmlLang(page)).toEqual(["ar", "rtl"]);
  await context.close();
});

test("a student's choice is saved to their profile and follows them to a new device", async ({ page, browser }) => {
  await signIn(page, "ahmed");
  await page.goto("/profile");
  await page
    .getByRole("button", { name: /العربية/ })
    .first()
    .click();
  await expect.poll(() => htmlLang(page)).toEqual(["ar", "rtl"]);

  const elsewhere = await browser.newContext({ locale: "en-GB" });
  const other = await elsewhere.newPage();
  await signIn(other, "ahmed");
  expect(await htmlLang(other)).toEqual(["ar", "rtl"]);
  await elsewhere.close();
});

test("the app in Arabic: curriculum, dates with Western digits, and Arabic-first text", async ({ page }) => {
  await signIn(page, "ahmed");
  await page.goto("/profile");
  await page
    .getByRole("button", { name: /العربية/ })
    .first()
    .click();
  await expect.poll(() => htmlLang(page)).toEqual(["ar", "rtl"]);

  await page.goto(`/cohorts/${id("c_devops_01")}/modules/${id("m_devops_4")}/${id("m_devops_4_l2")}`);
  // The lesson title (an h2 under the cohort header).
  await expect(main(page).locator("h2").first()).toHaveText(ARABIC);
  await page.goto("/calendar");
  const calendar = await main(page).innerText();
  expect(calendar).toMatch(ARABIC);
  expect(calendar).toMatch(/[0-9]/);
  expect(calendar).not.toMatch(ARABIC_INDIC_DIGITS);
  expect(calendar).not.toMatch(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
  );
});

test("notifications and emails reach each person in their own language", async ({ page, as }) => {
  const sarah = await as("sarah");
  await sarah.goto("/profile");
  await sarah
    .getByRole("button", { name: /العربية/ })
    .first()
    .click();
  await expect.poll(() => htmlLang(sarah)).toEqual(["ar", "rtl"]);

  // Rakan works in English; Sarah reads in Arabic.
  await signIn(page, "rakan");
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}`);
  await page.getByRole("button", { name: /Send a reminder/ }).click();

  await expect
    .poll(async () => (await sentEmails(page.request, "sarah@academe.demo")).length, { timeout: 10_000 })
    .toBe(1);
  const [mail] = await sentEmails(page.request, "sarah@academe.demo");
  expect(mail.subject).toContain("تذكير");
  expect(mail.html).toContain('dir="rtl"');

  await sarah.goto("/notifications");
  await expect(sarah.locator("main")).toContainText("تذكير");
});
