import { expectNoHorizontalScroll, resetData, signIn, expect, test, id } from "./helpers";

// Runs in the desktop, tablet and phone projects (see playwright.config.ts).
const PAGES = {
  public: ["/", "/login", "/verify"],
  ahmed: [
    "/dashboard",
    "/programmes",
    `/cohorts/${id("c_devops_01")}`,
    `/cohorts/${id("c_devops_01")}/schedule`,
    `/cohorts/${id("c_devops_01")}/modules`,
    `/cohorts/${id("c_devops_01")}/modules/${id("m_devops_4")}`,
    `/cohorts/${id("c_devops_01")}/modules/${id("m_devops_4")}/${id("m_devops_4_l2")}`,
    `/cohorts/${id("c_devops_01")}/classes`,
    `/cohorts/${id("c_devops_01")}/labs`,
    `/cohorts/${id("c_devops_01")}/assignments`,
    `/cohorts/${id("c_devops_01")}/assignments/${id("a_2")}`,
    `/cohorts/${id("c_devops_01")}/office-hours`,
    `/cohorts/${id("c_devops_01")}/projects`,
    `/cohorts/${id("c_devops_01")}/certificate`,
    "/community",
    "/community/cohort-01-general",
    "/calendar",
    "/resources",
    "/notifications",
    "/profile",
  ],
  rakan: [
    "/admin",
    `/admin/cohorts/${id("c_devops_01")}`,
    `/admin/cohorts/${id("c_devops_01")}/grading`,
    `/admin/cohorts/${id("c_devops_01")}/grading/${id("a_3")}`,
    `/admin/cohorts/${id("c_devops_01")}/labs`,
    `/admin/cohorts/${id("c_devops_01")}/attendance`,
    `/admin/cohorts/${id("c_devops_01")}/classes`,
    `/admin/cohorts/${id("c_devops_01")}/classes/new`,
    `/admin/cohorts/${id("c_devops_01")}/projects`,
    `/admin/cohorts/${id("c_devops_01")}/office-hours`,
    `/admin/cohorts/${id("c_devops_00")}/certificates`,
    "/admin/cohorts/new",
    "/admin/students",
    "/admin/programmes",
    "/admin/programmes/new",
    `/admin/programmes/${id("p_devops")}`,
    "/admin/waitlist",
    "/admin/moderation",
  ],
} as const;

test.beforeEach(async ({ request }) => resetData(request));

test("public pages fit the screen", async ({ page }) => {
  for (const path of PAGES.public) {
    await page.goto(path);
    await expectNoHorizontalScroll(page);
  }
});

for (const who of ["ahmed", "rakan"] as const) {
  test(`${who}'s pages fit the screen and have one main heading`, async ({ page }) => {
    await signIn(page, who);
    for (const path of PAGES[who]) {
      await test.step(path, async () => {
        const res = await page.goto(path);
        expect(res?.status(), path).toBe(200);
        await expectNoHorizontalScroll(page);
        expect(await page.locator("main h1").count(), `${path} has at most one h1`).toBeLessThanOrEqual(1);
      });
    }
  });
}

test("navigation suits the screen: sidebar on wide screens, bottom bar on phones", async ({ page }, info) => {
  await signIn(page, "ahmed");
  const bottomBar = page.getByRole("navigation", { name: "Main" });
  if (info.project.name === "phone") {
    await expect(bottomBar).toBeVisible();
    await expect(bottomBar.locator("a, button")).toHaveText(["Home", "Learn", "Community", "Calendar", "More"]);
    await bottomBar.getByRole("button", { name: "More" }).click();
    await page.locator("#more-menu").getByRole("link", { name: "Resources" }).click();
    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.locator("#more-menu")).toBeHidden();
  } else {
    await expect(bottomBar).toBeHidden();
    await expect(page.locator("aside").first().getByRole("link", { name: "Calendar" })).toBeVisible();
  }
});
