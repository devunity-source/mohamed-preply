import type { Page } from "@playwright/test";
import { academyWeekday, main, resetData, signIn, expect, test, id } from "./helpers";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Set DevOps #01's hours through the instructor's editor. */
async function setHours(page: Page, days: number[], start = "00:00", end = "23:59") {
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/office-hours`);
  const f = main(page).locator("form").filter({ hasText: "Save hours" });
  for (const d of ALL_DAYS) {
    const box = f.locator(`input[name="on:${d}"]`);
    if (days.includes(d)) await box.check();
    else await box.uncheck();
    await f.locator(`input[name="start:${d}"]`).fill(start);
    await f.locator(`input[name="end:${d}"]`).fill(end);
  }
  await f.getByRole("button", { name: "Save hours" }).click();
  return f;
}

async function sendAsStudent(student: Page, text: string) {
  await student.goto(`/cohorts/${id("c_devops_01")}/office-hours`);
  await student.locator("main textarea[name=body]").fill(text);
  await student.getByRole("button", { name: "Send message" }).click();
  await expect(student.locator("main [role=status]").filter({ hasText: "Sent" })).toBeVisible();
}

test.beforeEach(async ({ page, request }) => {
  await resetData(request);
  await signIn(page, "rakan");
});

test("the seeded schedule is Monday to Friday, 08:00 to 17:00; bad times are refused", async ({ page }) => {
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/office-hours`);
  await expect(page.locator('input[name="start:0"]')).toHaveValue("08:00");
  await expect(page.locator('input[name="end:4"]')).toHaveValue("17:00");
  await expect(page.locator('input[name="on:5"]')).not.toBeChecked();
  const f = await setHours(page, [0], "17:00", "08:00");
  await expect(f.getByRole("alert")).toContainText("end time has to be after");
});

test("outside office hours the message box is greyed out, and the server refuses a forced send", async ({
  page,
  as,
}) => {
  await setHours(
    page,
    ALL_DAYS.filter((d) => d !== academyWeekday()),
    "08:00",
    "17:00",
  );
  const ahmed = await as("ahmed");
  await ahmed.goto(`/cohorts/${id("c_devops_01")}/office-hours`);
  await expect(ahmed.locator("main")).toContainText("Closed");
  await expect(ahmed.locator("main")).toContainText(/Opens tomorrow at 08:00/i);
  await expect(ahmed.locator("main textarea[name=body]")).toBeDisabled();
  await expect(ahmed.getByRole("button", { name: "Send message" })).toBeDisabled();
  await expect(ahmed.locator("main fieldset")).toHaveClass(/opacity-50/);

  // Re-enable the form in the browser and send anyway.
  await ahmed.locator("main fieldset").evaluate((el: HTMLFieldSetElement) => (el.disabled = false));
  await ahmed.locator("main textarea[name=body]").fill("Sneaking in after hours");
  await ahmed.getByRole("button", { name: "Send message" }).click();
  await expect(ahmed.locator("main [role=alert]")).toContainText("Office hours are closed");

  await ahmed.goto("/dashboard");
  await expect(ahmed.locator("section", { hasText: "See hours and messages" })).toContainText("Closed");
});

test("during office hours: send, get notified, reply, see the reply", async ({ page, as }) => {
  await setHours(page, ALL_DAYS);
  const ahmed = await as("ahmed");
  await ahmed.goto(`/cohorts/${id("c_devops_01")}/office-hours`);
  await expect(ahmed.locator("main")).toContainText("Open now");
  await sendAsStudent(ahmed, "My AKS cluster won't pull images from ACR.");

  await page.goto("/notifications");
  await expect(main(page)).toContainText("Office hours: Ahmed sent you a message");
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/office-hours?student=${id("u_ahmed")}`);
  await expect(main(page)).toContainText("won't pull images");
  await main(page).locator("textarea[name=body]").fill("Attach ACR with az aks update --attach-acr.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(main(page).getByRole("status").filter({ hasText: "Sent" })).toBeVisible();

  await ahmed.goto("/dashboard");
  await expect(ahmed.locator("main")).toContainText("1 new reply from your instructor");
  await ahmed.goto("/notifications");
  await expect(ahmed.locator("main")).toContainText("replied to your office hours message");
  await ahmed.goto(`/cohorts/${id("c_devops_01")}/office-hours`);
  await expect(ahmed.locator("main")).toContainText("--attach-acr");
});

// Code review of 77bcabb, finding 3: counts didn't clear without a full reload.
test("opening a conversation clears the unread count without reloading", async ({ page, as }) => {
  await setHours(page, ALL_DAYS);
  const ahmed = await as("ahmed");
  await sendAsStudent(ahmed, "Question one");

  await page.goto(`/admin/cohorts/${id("c_devops_01")}`);
  await expect(page.getByRole("link", { name: "Office hours (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Office hours (1)" }).click();
  await expect(main(page)).toContainText("Question one");
  // Same page, no reload: the tab label updates once the thread is marked read.
  await expect(page.getByRole("link", { name: "Office hours", exact: true })).toBeVisible();
});

test("a message that arrives while the conversation is open is marked read too", async ({ page, as }) => {
  await setHours(page, ALL_DAYS);
  const ahmed = await as("ahmed");
  await sendAsStudent(ahmed, "First message");
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/office-hours?student=${id("u_ahmed")}`);
  await expect(page.getByRole("link", { name: "Office hours", exact: true })).toBeVisible();

  await sendAsStudent(ahmed, "Second message while you're looking");
  // Client-side navigation back to the same conversation (the component stays mounted).
  await main(page)
    .getByRole("link", { name: /Ahmed Hassan/ })
    .click();
  await expect(main(page)).toContainText("Second message while you're looking");
  await expect(page.getByRole("link", { name: "Office hours", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Office hours \(\d+\)/ })).toHaveCount(0);
});

test("the student's new-reply count clears once they've read the reply", async ({ page, as }) => {
  await setHours(page, ALL_DAYS);
  const ahmed = await as("ahmed");
  await sendAsStudent(ahmed, "Ping");
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/office-hours?student=${id("u_ahmed")}`);
  await main(page).locator("textarea[name=body]").fill("Pong");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(main(page).getByRole("status").filter({ hasText: "Sent" })).toBeVisible();

  await ahmed.goto("/dashboard");
  await expect(ahmed.locator("main")).toContainText("1 new reply");
  await ahmed.getByRole("link", { name: "Message your instructor" }).click();
  await expect(ahmed.locator("main")).toContainText("Pong");
  await ahmed.getByRole("link", { name: "Home" }).first().click();
  await expect(ahmed).toHaveURL(/\/dashboard$/);
  await expect(ahmed.locator("main")).not.toContainText("new reply");
});

test("conversations are private, and removed students lose office hours", async ({ page, as }) => {
  await setHours(page, ALL_DAYS);
  const ahmed = await as("ahmed");
  await sendAsStudent(ahmed, "Private to me and my instructor");

  const maria = await as("maria");
  await maria.goto(`/cohorts/${id("c_devops_01")}/office-hours`);
  await expect(maria.locator("main")).not.toContainText("Private to me");
  await expect(maria.locator("main")).toContainText("hub VNet");

  const samira = await as("samira");
  expect((await samira.goto(`/admin/cohorts/${id("c_devops_01")}/office-hours`))?.status()).toBe(404);

  await page.goto(`/admin/cohorts/${id("c_devops_01")}`);
  await main(page).getByRole("button", { name: "Remove Ahmed Hassan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove student" }).click();
  await expect(main(page).locator("table")).not.toContainText("Ahmed Hassan");
  expect((await ahmed.goto(`/cohorts/${id("c_devops_01")}/office-hours`))?.status()).toBe(404);
});
