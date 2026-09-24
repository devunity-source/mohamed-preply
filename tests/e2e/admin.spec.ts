import { main, resetData, signIn, expect, test, id, NEW_ID, SUPABASE, emailLink } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetData(request);
  await signIn(page, "rakan");
});

test("issue, verify and revoke a certificate", async ({ page, anon }) => {
  await page.goto(`/admin/cohorts/${id("c_devops_00")}/certificates`);
  const ines = main(page).locator("li, tr, div").filter({ hasText: "Ines Costa" }).last();
  await ines.getByRole("button", { name: /Issue certificate/ }).click();
  await expect(main(page)).toContainText(/ACM-DEV-\d{4}-00003/);
  const certId = (await main(page).innerText()).match(/ACM-DEV-\d{4}-00003/)![0];

  const visitor = await anon();
  await visitor.goto(`/verify/${certId}`);
  await expect(visitor.locator("main")).toContainText("Valid certificate");
  await expect(visitor.locator("main")).toContainText("Ines Costa");

  const row = main(page).locator("li, tr, div").filter({ hasText: certId }).last();
  await row.getByRole("button", { name: /Revoke/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke certificate" }).click();
  await expect(main(page)).toContainText("Revoked");
  await visitor.reload();
  await expect(visitor.locator("main")).toContainText(/revoked/i);
});

test("price and publishing changes show on the landing page", async ({ page }) => {
  await page.goto(`/admin/programmes/${id("p_ai")}`);
  await page.fill("input[name=price]", "650");
  await page.getByRole("button", { name: "Save programme" }).click();
  await expect(main(page).getByText("Saved").first()).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#programmes")).toContainText("$650");

  await page.goto(`/admin/programmes/${id("p_ai")}`);
  await page.locator("input[name=published]").uncheck();
  await page.getByRole("button", { name: "Save programme" }).click();
  await expect(main(page).getByText("Saved").first()).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#programmes")).not.toContainText("AI Engineering");
});

test("create a programme: duplicate certificate codes are refused; it starts as a draft", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "New programme" }).click();
  const f = main(page).locator("form");
  await f.locator("input[name=title]").fill("Cloud Security Engineer");
  await f.locator("input[name=weeks]").fill("8");
  await f.locator("input[name=price]").fill("720");
  await f.locator("input[name=certCode]").fill("dev");
  await f.getByRole("button", { name: "Create programme" }).click();
  await expect(f.getByRole("alert")).toContainText("already uses DEV");
  await expect(f.locator("input[name=title]")).toHaveValue("Cloud Security Engineer");
  await f.locator("input[name=certCode]").fill("sec");
  await f.getByRole("button", { name: "Create programme" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/programmes/${NEW_ID}\\?created=1$`));
  await expect(main(page)).toContainText("Created as a draft with 8 empty weeks");
  await expect(main(page)).toContainText("Certificate code: SEC");
  await page.goto("/");
  await expect(page.locator("#programmes")).not.toContainText("Cloud Security Engineer");
});

test("create a cohort: past dates are refused; the instructor is told and gets its spaces", async ({ page, as }) => {
  await page.goto(`/admin/cohorts/new?programme=${id("p_devops")}`);
  const f = main(page).locator("form");
  await f.locator("select[name=instructorId]").selectOption(`${id("u_samira")}`);
  await f.locator("input[name=startsOn]").evaluate((i: HTMLInputElement) => {
    i.removeAttribute("min");
    i.value = "2020-01-06";
  });
  await f.getByRole("button", { name: "Create cohort" }).click();
  await expect(f.getByRole("alert")).toContainText("can't be in the past");
  const next = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
  await f.locator("input[name=startsOn]").fill(next);
  await f.getByRole("button", { name: "Create cohort" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/cohorts/${NEW_ID}$`));
  await expect(main(page)).toContainText("Cohort #03");

  const samira = await as("samira");
  await samira.goto("/notifications");
  await expect(samira.locator("main")).toContainText("You're teaching DevOps Engineer");
  expect((await samira.goto("/community/cohort-03-general"))?.status()).toBe(200);
});

test("add an existing student and a new one; remove a student", async ({ page, as, anon }) => {
  await page.goto(`/admin/cohorts/${id("c_ai_02")}`);
  const add = main(page).locator("section", { hasText: "Add a student" }).locator("form");
  const submit = async (email: string, name = "") => {
    await add.getByLabel("Email").fill(email);
    await add.getByLabel(/Full name/).fill(name);
    await add.getByRole("button", { name: "Add student" }).click();
  };
  await submit("ines@academe.demo");
  await expect(add.getByRole("status")).toContainText("Added Ines Costa");
  await submit("ines@academe.demo");
  await expect(add.getByRole("alert")).toContainText("already in this cohort");
  await submit("samira@academe.demo");
  await expect(add.getByRole("alert")).toContainText("instructor, not a student");
  await submit("new.person@example.com");
  await expect(add.getByRole("alert")).toContainText("add their full name");
  await submit("new.person@example.com", "New Person");
  if (SUPABASE) {
    // A real invite: accepting it sets their own password and lands them in the cohort.
    await expect(add.getByRole("status")).toContainText("email to choose a password");
    const invited = await anon();
    await invited.goto(await emailLink(page.request, "new.person@example.com"));
    await invited.getByRole("button", { name: "Continue" }).click();
    await expect(invited.locator("h1")).toContainText("Welcome, New");
    await invited.getByLabel("New password", { exact: true }).fill("my-own-password-1");
    await invited.getByLabel("New password again").fill("my-own-password-1");
    await invited.getByRole("button", { name: "Save password" }).click();
    await expect(invited).toHaveURL(/\/dashboard$/);
    expect((await invited.goto(`/cohorts/${id("c_ai_02")}`))?.status()).toBe(200);
  } else {
    await expect(add.getByRole("status")).toContainText(/Temporary password: \S+\./);
  }

  await page.reload();
  const table = main(page).locator("table");
  await expect(table).toContainText("Ines Costa");
  await main(page).getByRole("button", { name: "Remove Ines Costa" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("submissions and grades are kept");
  await dialog.getByRole("button", { name: "Remove student" }).click();
  await expect(table).not.toContainText("Ines Costa");

  const ines = await as("ines");
  expect((await ines.goto(`/cohorts/${id("c_ai_02")}`))?.status()).toBe(404);
});

test("the waitlist exports as a spreadsheet-safe CSV", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#waitlist form");
  await form.locator("input[name=email]").fill("csv.check@example.com");
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.locator("#waitlist")).toContainText("You're on the list");

  const res = await page.request.get("/admin/waitlist.csv");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv.split("\n")[0].toLowerCase()).toContain("email");
  expect(csv).toContain("csv.check@example.com");
});
