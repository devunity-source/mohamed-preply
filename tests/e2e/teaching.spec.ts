import { main, resetData, signIn, expect, test, id, NEW_ID } from "./helpers";

// Teaching tools, used here by Rakan, who teaches DevOps #01. Instructors get
// the same tools for their own cohorts (see security.spec.ts for the limits).
test.beforeEach(async ({ page, request }) => {
  await resetData(request);
  await signIn(page, "rakan");
});

test.describe("grading", () => {
  test("rubric scores are checked, save-and-next moves on, and the student sees the grade", async ({ page, as }) => {
    await page.goto(`/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}?student=${id("u_ahmed")}`);
    const form = main(page)
      .locator("form")
      .filter({ has: page.locator("textarea[name=feedback]") });
    await form.locator('input[name="score:works"]').fill("50");
    await form.locator('input[name="score:quality"]').fill("20");
    await form.locator('input[name="score:docs"]').fill("18");
    await form.locator('input[name="score:security"]').fill("12");
    await form.locator("textarea[name=feedback]").fill("Clean modules. Add remote state locking.");
    await form.evaluate((f: HTMLFormElement) => (f.noValidate = true));
    await form.getByRole("button", { name: /Save/ }).click();
    await expect(form.getByRole("alert")).toContainText("0 to 40");

    await form.locator('input[name="score:works"]').fill("36");
    await expect(form).toContainText("86/100");
    await form.locator("textarea[name=feedback]").press("Control+Enter");
    await expect(page).toHaveURL(new RegExp(`graded=${id("u_ahmed")}`));
    await expect(main(page).getByRole("status")).toContainText("Saved Ahmed Hassan's grade (86/100)");
    await expect(main(page).locator('a[aria-current="true"] [aria-label="Needs grading"]')).toHaveCount(1);

    const ahmed = await as("ahmed");
    await ahmed.goto(`/cohorts/${id("c_devops_01")}/assignments/${id("a_3")}`);
    await expect(ahmed.locator("main")).toContainText("86");
    await expect(ahmed.locator("main")).toContainText("Clean modules. Add remote state locking.");
  });

  test("j and k move between submissions", async ({ page }) => {
    await page.goto(`/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}`);
    const current = () => main(page).locator('a[aria-current="true"]').innerText();
    const first = await current();
    await page.keyboard.press("j");
    await expect.poll(current).not.toBe(first);
    await page.keyboard.press("k");
    await expect.poll(current).toBe(first);
  });

  test("a reminder reaches the student who hasn't submitted", async ({ page, as }) => {
    await page.goto(`/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}`);
    await page.getByRole("button", { name: /Send a reminder/ }).click();
    const sarah = await as("sarah");
    await sarah.goto("/notifications");
    await expect(sarah.locator("main")).toContainText("Reminder");
  });
});

test("lab reviews: pass one and return one", async ({ page }) => {
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/labs`);
  const pass = page.getByRole("button", { name: "Pass" });
  const before = await pass.count();
  expect(before).toBeGreaterThanOrEqual(2);
  await pass.first().click();
  await expect(pass).toHaveCount(before - 1);
  await page.getByRole("button", { name: "Return" }).first().click();
  await expect(pass).toHaveCount(before - 2);
});

test("attendance starts from saved marks, fills the rest and saves", async ({ page }) => {
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/attendance`);
  const form = main(page).locator("form").filter({ hasText: "Mark remaining present" });
  const first = form.locator("li").first();
  await first
    .locator("input[type=radio]")
    .evaluateAll((rs) => rs.forEach((r) => ((r as HTMLInputElement).checked = false)));
  await first.getByText("Absent").click();
  await form.getByRole("button", { name: "Mark remaining present" }).click();
  const rows = await form.locator("li").count();
  await expect(form.locator("input[type=radio]:checked")).toHaveCount(rows);
  await form.getByRole("button", { name: "Save attendance" }).click();
  await expect(form.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(main(page).locator("form li").first().locator('input[value="absent"]')).toBeChecked();
});

test("scheduling a class checks links and shows it to students", async ({ page, as }) => {
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/classes/new`);
  await page.fill("input[name=title]", "QA: Kubernetes Q&A");
  await page.fill("input[name=meetingUrl]", "https://zoom.us/j/123");
  await page.fill("input[name=recordingUrl]", "http://insecure.example");
  await page.getByRole("button", { name: "Schedule class" }).click();
  await expect(main(page).getByRole("alert")).toContainText("https");
  await expect(page.locator("input[name=title]")).toHaveValue("QA: Kubernetes Q&A");
  await page.fill("input[name=recordingUrl]", "");
  await page.getByRole("button", { name: "Schedule class" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(main(page)).toContainText("QA: Kubernetes Q&A");

  const ahmed = await as("ahmed");
  await ahmed.goto(`/cohorts/${id("c_devops_01")}/classes`);
  await expect(ahmed.locator("main")).toContainText("QA: Kubernetes Q&A");
});

test("capstone teams and their milestones are listed", async ({ page }) => {
  await page.goto(`/admin/cohorts/${id("c_devops_01")}/projects`);
  await expect(main(page)).toContainText("Team Aurora");
  const aurora = main(page).locator("section", { hasText: "Team Aurora" });
  await expect(aurora).toContainText("Architecture proposal");
  await expect(aurora).toContainText("Presentation:");
});

test("moderation: pin and lock a thread; students can't reply to a locked thread", async ({ page, as }) => {
  await page.goto("/community/cohort-01-questions");
  await main(page).locator('a[href^="/community/cohort-01-questions/"]').first().click();
  await expect(page).toHaveURL(new RegExp(`/community/cohort-01-questions/${NEW_ID}`));
  const url = page.url();
  await main(page).getByRole("button", { name: "Pin", exact: true }).click();
  await expect(main(page).getByRole("button", { name: "Unpin" })).toBeVisible();
  await main(page).getByRole("button", { name: "Lock replies" }).click();
  await expect(main(page)).toContainText("This thread is locked");

  const ahmed = await as("ahmed");
  await ahmed.goto(url);
  await expect(ahmed.locator("main")).toContainText("This thread is locked");
  await expect(ahmed.locator("main textarea[name=body]")).toHaveCount(0);
});
