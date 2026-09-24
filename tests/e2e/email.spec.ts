import { expect, id, resetData, runClassReminders, sentEmails, signIn, test } from "./helpers";

// Emails land in the test outbox (never Resend). Sending happens just after
// each response, so checks poll briefly.

test.beforeEach(async ({ request }) => resetData(request));

const polled = (fn: () => Promise<unknown>) => expect.poll(fn, { timeout: 10_000 });

test("joining the waitlist sends one confirmation, and joining again sends none", async ({ page }) => {
  const join = async () => {
    await page.goto("/");
    const form = page.locator("#waitlist form");
    await form.locator("input[name=email]").fill("future.student@example.com");
    await form.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.locator("#waitlist")).toContainText("You're on the list");
  };
  await join();
  await polled(async () => (await sentEmails(page.request, "future.student@example.com")).length).toBe(1);
  const [mail] = await sentEmails(page.request, "future.student@example.com");
  expect(mail.subject).toContain("You're on the waitlist");

  await join();
  await page.waitForTimeout(1500);
  expect(await sentEmails(page.request, "future.student@example.com")).toHaveLength(1);
});

test("a reminder email can be turned off from its link and back on in settings", async ({ page, as, anon }) => {
  await signIn(page, "rakan");
  const remind = async () => {
    await page.goto(`/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}`);
    await page.getByRole("button", { name: /Send a reminder/ }).click();
  };
  const toSarah = () => sentEmails(page.request, "sarah@academe.demo");

  await remind();
  await polled(async () => (await toSarah()).length).toBe(1);
  const [mail] = await toSarah();
  expect(mail.subject).toContain("Reminder");
  expect(mail.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  const link = mail.html.match(/href="([^"]*\/email\/unsubscribe\?[^"]*)"/)![1].replaceAll("&amp;", "&");

  // A tampered link (someone else's id) is refused.
  const visitor = await anon();
  await visitor.goto(link.replace(/u=[^&]+/, `u=${id("u_ahmed")}`));
  await expect(visitor.locator("h1")).toContainText("doesn't work");

  // Opening the real link changes nothing; the button does.
  await visitor.goto(link);
  await expect(visitor.locator("h1")).toContainText("Stop reminder emails?");
  await remind();
  await polled(async () => (await toSarah()).length).toBe(2);
  await visitor.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(visitor.locator("h1")).toContainText("You're unsubscribed");

  await remind();
  await page.waitForTimeout(1500);
  expect(await toSarah()).toHaveLength(2);
  const sarah = await as("sarah");
  await sarah.goto("/notifications");
  await expect(sarah.locator("main").getByText(/Reminder/)).toHaveCount(3);

  // Back on from the profile.
  await sarah.goto("/profile#email");
  const settings = sarah.locator("#email form");
  await expect(settings.getByLabel(/Reminders/)).not.toBeChecked();
  await settings.getByLabel(/Reminders/).check();
  await settings.getByRole("button", { name: "Save email settings" }).click();
  await expect(settings.getByRole("status")).toContainText("Saved");
  await remind();
  await polled(async () => (await toSarah()).length).toBe(3);
});

test("mail apps' one-click unsubscribe works only with a valid link", async ({ page, as }) => {
  await signIn(page, "rakan");
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}`);
  await page.getByRole("button", { name: /Send a reminder/ }).click();
  await polled(async () => (await sentEmails(page.request, "sarah@academe.demo")).length).toBe(1);
  const [mail] = await sentEmails(page.request, "sarah@academe.demo");
  const oneClick = mail.headers!["List-Unsubscribe"].slice(1, -1);

  expect((await page.request.post(oneClick.replace(/t=[^&]+/, "t=" + "x".repeat(32)))).status()).toBe(404);
  expect((await page.request.post(oneClick)).status()).toBe(200);
  const sarah = await as("sarah");
  await sarah.goto("/profile#email");
  await expect(sarah.locator("#email form").getByLabel(/Reminders/)).not.toBeChecked();
});

test("class reminders go once per student, only to those who want them", async ({ page, as }) => {
  const sarah = await as("sarah");
  await sarah.goto("/profile#email");
  const settings = sarah.locator("#email form");
  await settings.getByLabel(/Reminders/).uncheck();
  await settings.getByRole("button", { name: "Save email settings" }).click();
  await expect(settings.getByRole("status")).toContainText("Saved");

  // A class 30 minutes from now, in academy time.
  const at = new Date(Date.now() + 30 * 60_000);
  const part = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", ...o }).format(at);
  await signIn(page, "rakan");
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/classes/new`);
  await page.fill("input[name=title]", "QA: reminder check");
  await page.fill("input[name=date]", part({ year: "numeric", month: "2-digit", day: "2-digit" }));
  await page.fill("input[name=time]", part({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
  await page.fill("input[name=meetingUrl]", "https://zoom.us/j/123");
  await page.getByRole("button", { name: "Schedule class" }).click();
  await expect(page).toHaveURL(/\/classes$/);

  expect((await page.request.get("/api/cron/class-reminders")).status()).toBe(404);
  const first = await runClassReminders(page.request);
  expect(first.reminders).toBeGreaterThan(0);
  const aboutIt = (to: string) => async () =>
    (await sentEmails(page.request, to)).filter((e) => e.subject.includes("QA: reminder check")).length;
  await polled(aboutIt("ahmed@academe.demo")).toBe(1);
  expect(await aboutIt("sarah@academe.demo")()).toBe(0);

  expect((await runClassReminders(page.request)).reminders).toBe(0);
  await page.waitForTimeout(1500);
  expect(await aboutIt("ahmed@academe.demo")()).toBe(1);
});
