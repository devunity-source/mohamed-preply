import { main, resetData, signIn, expect, test, id } from "./helpers";

test.beforeEach(async ({ request }) => resetData(request));

test.describe("landing page", () => {
  test("shows the evening hero, the six-week strip and both programmes with USD prices", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Switch into cloud with a cohort, not a playlist.",
    );
    await expect(main(page)).toContainText("Mondays and Thursdays at 19:00 Dubai time");
    const strip = page.getByLabel(/week by week/);
    await expect(strip.getByRole("listitem")).toHaveCount(6);
    await expect(strip).toContainText(/Starts \d{1,2} \w{3}/);
    const programmes = page.locator("#programmes");
    await expect(programmes).toContainText("DevOps Engineer");
    await expect(programmes).toContainText("$670");
    await expect(programmes).toContainText("AI Engineering");
    await expect(programmes).toContainText("$790");
  });

  test("a programme's waitlist button preselects it in the form", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("#programmes article")
      .filter({ hasText: "DevOps Engineer" })
      .getByRole("link", { name: "Join the waitlist" })
      .click();
    await expect(page).toHaveURL(/programme=devops-engineer#waitlist/);
    await expect(page.locator("#waitlist select[name=programme]")).toHaveValue("devops-engineer");
  });

  test("the waitlist rejects a bad email and accepts a good one", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#waitlist form");
    await form.locator("input[name=email]").fill("not-an-email@");
    await form.evaluate((f: HTMLFormElement) => (f.noValidate = true));
    await form.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await form.locator("input[name=email]").fill("qa.person@example.com");
    await form.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.locator("#waitlist")).toContainText("You're on the list");
  });

  test("joining twice looks the same as joining once (no way to probe who's listed)", async ({ page, anon }) => {
    for (const p of [page, await anon()]) {
      await p.goto("/");
      const form = p.locator("#waitlist form");
      await form.locator("input[name=email]").fill("twice@example.com");
      await form.getByRole("button", { name: "Join the waitlist" }).click();
      await expect(p.locator("#waitlist")).toContainText("You're on the list");
    }
  });

  test("uses sentence case, no uppercase monospace labels", async ({ page }) => {
    await page.goto("/");
    const shouting = await page.evaluate(
      () =>
        [...document.querySelectorAll("main *")].filter(
          (e) => getComputedStyle(e).textTransform === "uppercase" && e.textContent?.trim(),
        ).length,
    );
    expect(shouting).toBe(0);
  });
});

test.describe("certificate verification", () => {
  test("a valid certificate verifies publicly; bad IDs are explained; the lookup form normalises case", async ({
    page,
    anon,
  }) => {
    await signIn(page, "yara");
    await page.goto(`/cohorts/${id("c_devops_00")}/certificate`);
    const certId = (await main(page).innerText()).match(/ACM-DEV-\d{4}-\d{5}/)![0];

    const visitor = await anon();
    await visitor.goto(`/verify/${certId}`);
    await expect(visitor.locator("main")).toContainText("Valid certificate");
    await expect(visitor.locator("main")).toContainText("Yara Saleh");

    await visitor.goto("/verify/NOT-A-REAL-ID");
    await expect(visitor.locator("main")).toContainText("Check the ID");

    await visitor.goto(`/verify?id=${certId.toLowerCase()}`);
    await expect(visitor).toHaveURL(new RegExp(`/verify/${certId}$`));
  });
});

test.describe("signed-out visitors", () => {
  test("app pages send you to sign in and come back afterwards", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login\?next=%2Fcalendar/);
    await expect(page.getByRole("link", { name: "Join the waitlist" })).toBeVisible();
  });

  test("security headers are set and the framework isn't advertised", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toMatch(/frame-ancestors 'none'|frame-ancestors 'self'/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("the test reset hook refuses callers without the secret", async ({ request }) => {
    expect((await request.post("/api/test/reset")).status()).toBe(404);
    expect((await request.post("/api/test/reset", { headers: { "x-e2e-secret": "wrong" } })).status()).toBe(404);
  });
});
