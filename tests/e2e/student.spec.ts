import { main, resetData, signIn, expect, test } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetData(request);
  await signIn(page, "ahmed");
});

const progress = async (page: import("@playwright/test").Page) => {
  await page.goto("/dashboard");
  const card = page.locator("section", { hasText: "Your progress" });
  return Number((await card.innerText()).match(/(\d+)%/)![1]);
};

test("first visit shows a welcome card that stays dismissed", async ({ page }) => {
  const welcome = page.getByRole("region", { name: /Welcome to AcadeMe/ });
  await expect(welcome).toBeVisible();
  await welcome.getByRole("button", { name: "Got it" }).click();
  await expect(welcome).toBeHidden();
  await page.reload();
  await expect(page.getByRole("region", { name: /Welcome to AcadeMe/ })).toHaveCount(0);
});

test("progress explains what it's made of", async ({ page }) => {
  await expect(page.locator("section", { hasText: "Your progress" })).toContainText(
    /\d+\/\d+ lessons · \d+\/\d+ labs · \d+\/\d+ assignments/,
  );
});

test("continue learning, mark done and move on; progress goes up", async ({ page }) => {
  const before = await progress(page);
  await page.getByRole("link", { name: /Continue where you left off/ }).click();
  await expect(page).toHaveURL(/m_devops_4_l2$/);
  await expect(main(page)).toContainText(/Lesson 2 of 4/i);
  await page.getByRole("button", { name: /Mark done and continue/ }).click();
  await expect(page).toHaveURL(/m_devops_4_l3$/);
  expect(await progress(page)).toBeGreaterThan(before);
});

test("a lab can be started and submitted", async ({ page }) => {
  await page.goto("/cohorts/c_devops_01/labs");
  const lab = page.locator("#lab_5");
  await lab.getByRole("button", { name: /Start lab/ }).click();
  await expect(lab).toContainText(/In progress/i);
  await lab.getByRole("button", { name: /Submit lab/ }).click();
  await expect(lab).toContainText(/Submitted/i);
});

test("an assignment rejects a non-repository link, keeps the text, then accepts a real one", async ({ page }) => {
  await page.goto("/cohorts/c_devops_01/assignments");
  await main(page)
    .getByRole("link", { name: /Deploy a microservice to AKS/ })
    .first()
    .click();
  const url = page.locator("input[name=repoUrl]");
  await url.fill("https://example.com/not-a-repo");
  await page.getByRole("button", { name: /Submit assignment/ }).click();
  await expect(main(page).getByRole("alert")).toBeVisible();
  await expect(url).toHaveValue("https://example.com/not-a-repo");
  await url.fill("https://github.com/ahmed/aks-microservice");
  await page.getByRole("button", { name: /Submit assignment/ }).click();
  await expect(main(page)).toContainText(/Submitted/i);
});

test("search finds lessons and never shows admin tools to a student", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search" });
  const box = dialog.getByRole("combobox");
  await box.fill("pods deploy");
  await expect(dialog.getByRole("option").first()).toContainText("Pods, Deployments and Services");
  await box.press("Enter");
  await expect(page).toHaveURL(/m_devops_4_l2$/);
  await page.keyboard.press("/");
  await dialog.getByRole("combobox").fill("grading");
  await expect(dialog).toContainText("Nothing matches");
});

test("calendar, resources and notifications load, and notifications can be cleared", async ({ page }) => {
  await page.goto("/calendar");
  await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/resources");
  await expect(main(page)).toContainText("Cheat sheets");
  await page.goto("/notifications");
  await main(page).getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page
      .getByRole("link", { name: /Notifications/ })
      .first()
      .locator("span.bg-accent"),
  ).toHaveCount(0);
});

test("a graduate sees their certificate on their profile with a verify link", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page, "yara");
  await page.goto("/profile");
  await expect(
    main(page)
      .locator("section", { hasText: "Certificates" })
      .getByRole("link", { name: /ACM-DEV-/ }),
  ).toBeVisible();
});
