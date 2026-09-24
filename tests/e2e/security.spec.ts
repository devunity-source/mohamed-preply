import type { Page } from "@playwright/test";
import { main, resetData, signIn, expect, test } from "./helpers";

test.beforeEach(async ({ request }) => resetData(request));

const status = async (page: Page, path: string) => (await page.goto(path))?.status();

test.describe("role boundaries (404, so pages don't reveal what exists)", () => {
  test("students can't reach the admin area or other cohorts", async ({ page }) => {
    await signIn(page, "ahmed");
    for (const path of [
      "/admin",
      "/admin/students",
      "/admin/cohorts/c_devops_01",
      "/admin/programmes/new",
      "/cohorts/c_ai_02",
    ]) {
      expect(await status(page, path), path).toBe(404);
    }
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("instructors only reach the cohorts they teach, and no academy-wide pages", async ({ page }) => {
    await signIn(page, "samira");
    expect(await status(page, "/admin")).toBe(200);
    expect(await status(page, "/admin/cohorts/c_ai_02")).toBe(200);
    for (const path of [
      "/admin/cohorts/c_devops_01",
      "/admin/cohorts/c_devops_01/grading",
      "/admin/students",
      "/admin/waitlist",
      "/admin/programmes/p_devops",
      "/admin/programmes/new",
      "/admin/cohorts/new",
      "/admin/cohorts/c_ai_02/certificates",
    ]) {
      expect(await status(page, path), path).toBe(404);
    }
    expect((await page.request.get("/admin/waitlist.csv")).status()).not.toBe(200);
  });
});

test.describe("tampered requests", () => {
  test("a student can't mark their own lab as passed by editing the request", async ({ page }) => {
    await signIn(page, "ahmed");
    await page.route("**/cohorts/c_devops_01/labs", async (route) => {
      const req = route.request();
      if (req.method() !== "POST") return route.continue();
      await route.continue({ postData: (req.postData() ?? "").replaceAll("in_progress", "passed") }).catch(() => {});
    });
    await page.goto("/cohorts/c_devops_01/labs");
    await page
      .locator("#lab_5")
      .getByRole("button", { name: /Start lab/ })
      .click();
    await page.waitForTimeout(1000);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.goto("/cohorts/c_devops_01/labs");
    await expect(page.locator("#lab_5")).not.toContainText(/Passed/i);
  });

  test("an instructor replaying an admin's add-student request is refused", async ({ page, as }) => {
    await signIn(page, "rakan");
    let captured: { headers: Record<string, string>; body: string } | undefined;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"])
        captured = { headers: r.headers(), body: r.postData() ?? "" };
    });
    await page.goto("/admin/cohorts/c_ai_02");
    const add = main(page).locator("section", { hasText: "Add a student" }).locator("form");
    await add.getByLabel("Email").fill("ben@academe.demo");
    await add.getByRole("button", { name: "Add student" }).click();
    await expect(add.getByRole("status")).toContainText("Added Ben");

    const samira = await as("samira");
    const cookie = (await samira.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await samira.request.fetch("/admin/cohorts/c_ai_02", {
      method: "POST",
      headers: { ...captured!.headers, cookie },
      data: captured!.body.replace("ben@academe.demo", "yara@academe.demo"),
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);

    await page.reload();
    await expect(main(page).locator("table")).toContainText("Ben Walker");
    await expect(main(page).locator("table")).not.toContainText("Yara Saleh");
  });
});
