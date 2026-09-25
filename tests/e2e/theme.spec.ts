import { expect, resetData, signIn, test } from "./helpers";

// Light and dark mode: the device decides until someone picks, the choice is
// remembered in a cookie, and the page renders in it on the next load.

test.beforeEach(async ({ request }) => resetData(request));

const NAVY = "rgb(15, 23, 42)";
const SLATE_50 = "rgb(248, 250, 252)";
const background = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const savedTheme = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.dataset.theme ?? null);
const TOGGLE = { name: "Switch between light and dark mode" };

test("with no choice made, the page follows the device", async ({ browser }) => {
  for (const [colorScheme, expected] of [
    ["dark", NAVY],
    ["light", SLATE_50],
  ] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto("/");
    expect(await savedTheme(page)).toBeNull();
    expect(await background(page)).toBe(expected);
    await context.close();
  }
});

test("the sun and moon switch the landing page and the choice survives a reload", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/");
  const toggle = page.locator("header").getByRole("button", TOGGLE);
  await expect(toggle.locator("svg.lucide-moon")).toBeVisible();

  await toggle.click();
  expect(await savedTheme(page)).toBe("dark");
  await expect.poll(() => background(page)).toBe(NAVY);
  await expect(toggle.locator("svg.lucide-sun")).toBeVisible();

  // Rendered dark by the server now, even though the device says light.
  await page.reload();
  expect(await savedTheme(page)).toBe("dark");
  expect(await background(page)).toBe(NAVY);

  await page.locator("header").getByRole("button", TOGGLE).click();
  expect(await savedTheme(page)).toBe("light");
  await expect.poll(() => background(page)).toBe(SLATE_50);
  await context.close();
});

test("the app has the toggle in the sidebar and on the profile, and they share the choice", async ({ page }) => {
  await signIn(page, "ahmed");
  await expect(page.locator("aside").first().getByRole("button", TOGGLE)).toContainText("Dark mode");
  await page.goto("/profile");
  await page.getByRole("main").getByRole("button", TOGGLE).click();
  expect(await savedTheme(page)).toBe("dark");
  await page.goto("/dashboard");
  expect(await savedTheme(page)).toBe("dark");
  expect(await background(page)).toBe(NAVY);
  await expect(page.locator("aside").first().getByRole("button", TOGGLE)).toContainText("Light mode");
});
