import { PASSWORD, main, resetData, signIn, expect, test } from "./helpers";

test.beforeEach(async ({ request }) => resetData(request));

async function attempt(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a wrong password and an unknown email get the same message", async ({ page }) => {
  await attempt(page, "ahmed@academe.demo", "wrong-password");
  const wrong = await page.locator("main [role=alert]").innerText();
  await attempt(page, "nobody@academe.demo", "wrong-password");
  await expect(page.locator("main [role=alert]")).toHaveText(wrong);
  expect(wrong).toMatch(/incorrect/);
});

test("signing in sets a locked-down session cookie, and signing out ends the session", async ({ page, context }) => {
  await signIn(page, "ahmed");
  const cookie = (await context.cookies()).find((c) => c.name.endsWith("academe_session"))!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  await page.goto("/profile");
  await main(page).getByRole("button", { name: "Sign out" }).click();
  await expect(page).not.toHaveURL(/\/profile/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("the ?next= redirect only goes to pages on this site", async ({ page }) => {
  for (const [next, expected] of [
    ["/calendar", /\/calendar$/],
    ["https://evil.example", /\/dashboard$/],
    ["//evil.example", /\/dashboard$/],
  ] as const) {
    await page.context().clearCookies();
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await page.getByLabel("Email").fill("ahmed@academe.demo");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(expected);
  }
});

test("repeated wrong passwords lock the account for a while", async ({ page }) => {
  for (let i = 0; i < 5; i++) await attempt(page, "maria@academe.demo", `wrong-${i}`);
  await attempt(page, "maria@academe.demo", PASSWORD);
  await expect(page.locator("main [role=alert]")).toContainText("Too many attempts");
});

test("one-click demo sign-in is off in a production build", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Demo mode")).toHaveCount(0);
});

test.describe("temporary passwords", () => {
  test("an admin-created student is nudged to change it, and changing it signs out other devices", async ({
    page,
    anon,
  }) => {
    await signIn(page, "rakan");
    await page.goto("/admin/cohorts/c_ai_02");
    const add = page.locator("section", { hasText: "Add a student" }).locator("form");
    await add.getByLabel("Email").fill("temp.student@example.com");
    await add.getByLabel(/Full name/).fill("Temp Student");
    await add.getByRole("button", { name: "Add student" }).click();
    const temp = (await add.getByRole("status").innerText()).match(/Temporary password: (\S+)\./)![1];

    const login = async (p: import("@playwright/test").Page, pw: string) => {
      await p.goto("/login");
      await p.getByLabel("Email").fill("temp.student@example.com");
      await p.getByLabel("Password").fill(pw);
      await p.getByRole("button", { name: "Sign in" }).click();
    };
    const laptop = await anon();
    const phone = await anon();
    await login(laptop, temp);
    await login(phone, temp);
    await expect(laptop.locator("main")).toContainText("temporary password");

    await laptop.getByRole("link", { name: "Change password" }).click();
    const form = laptop.locator("#password form");
    await form.getByLabel("Current password").fill("not-it-at-all");
    await form.getByLabel("New password", { exact: true }).fill("a-brand-new-pass");
    await form.getByLabel("New password again").fill("a-brand-new-pass");
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByRole("alert")).toContainText("incorrect");

    await form.getByLabel("Current password").fill(temp);
    await form.getByLabel("New password", { exact: true }).fill("short");
    await form.getByLabel("New password again").fill("short");
    await form.evaluate((f: HTMLFormElement) => (f.noValidate = true));
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByRole("alert")).toContainText("at least 10");

    await form.getByLabel("New password", { exact: true }).fill("a-brand-new-pass");
    await form.getByLabel("New password again").fill("a-brand-new-pass");
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByRole("status")).toContainText("Password changed");

    await laptop.goto("/dashboard");
    await expect(laptop.locator("main")).not.toContainText("temporary password");
    await phone.goto("/dashboard");
    await expect(phone).toHaveURL(/\/login/);

    await login(phone, temp);
    await expect(phone.locator("main [role=alert]")).toBeVisible();
    await login(phone, "a-brand-new-pass");
    await expect(phone).toHaveURL(/\/dashboard$/);
  });
});
