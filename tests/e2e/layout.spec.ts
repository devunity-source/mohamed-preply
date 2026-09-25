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

const NAV = {
  en: {
    main: "Main",
    tabs: ["Home", "Learn", "Community", "Calendar", "More"],
    resources: "Resources",
    calendar: "Calendar",
  },
  ar: {
    main: "القائمة الرئيسية",
    tabs: ["الرئيسية", "التعلّم", "المجتمع", "التقويم", "المزيد"],
    resources: "الموارد",
    calendar: "التقويم",
  },
};

test("navigation suits the screen: sidebar on wide screens, bottom bar on phones", async ({ page }, info) => {
  const arabic = info.project.name.endsWith("-ar");
  const nav = NAV[arabic ? "ar" : "en"];
  await signIn(page, "ahmed");
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  const bottomBar = page.getByRole("navigation", { name: nav.main, exact: true });
  if (info.project.name.startsWith("phone")) {
    await expect(bottomBar).toBeVisible();
    await expect(bottomBar.locator("a, button")).toHaveText(nav.tabs);
    await bottomBar.getByRole("button", { name: nav.tabs[4] }).click();
    await page.locator("#more-menu").getByRole("link", { name: nav.resources }).click();
    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.locator("#more-menu")).toBeHidden();
  } else {
    await expect(bottomBar).toBeHidden();
    const sidebar = page.locator("aside").first();
    await expect(sidebar.getByRole("link", { name: nav.calendar })).toBeVisible();
    // Right to left puts the sidebar on the right.
    const box = await sidebar.boundingBox();
    const width = page.viewportSize()!.width;
    if (arabic) expect(box!.x + box!.width).toBeGreaterThan(width - 5);
    else expect(box!.x).toBeLessThan(5);
  }
});
