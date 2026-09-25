import { main, resetData, signIn, expect, test, NEW_ID } from "./helpers";

async function newPost(page: import("@playwright/test").Page, title: string, body: string) {
  await page.getByRole("button", { name: /Start a discussion/ }).click();
  await page.locator("main input[name=title]").fill(title);
  await page.locator("main textarea[name=body]").fill(body);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  // Posting opens the new post.
  await expect(page).toHaveURL(new RegExp(`/community/cohort-01-general/${NEW_ID}`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

test.beforeEach(async ({ page, request }) => {
  await resetData(request);
  await signIn(page, "ahmed");
});

test("post, reply, react and mention someone, who gets notified", async ({ page, as }) => {
  await page.goto("/community/cohort-01-general");
  await newPost(page, "QA: Ingress TLS question", "How do I renew the cert? @rakan");
  await page.locator("textarea[name=body]").fill("Answering myself: cert-manager.");
  await page.getByRole("button", { name: "Reply" }).click();
  await expect(main(page)).toContainText("Answering myself");
  const fire = page.getByRole("button", { name: /React 🔥/ });
  await fire.click();
  await expect(fire).toHaveAttribute("aria-label", /React 🔥, 1/);

  const rakan = await as("rakan");
  await rakan.goto("/notifications");
  await expect(rakan.locator("main")).toContainText("Ahmed mentioned you in “QA: Ingress TLS question”");
});

test("spaces show unread counts; opening one marks its posts New once", async ({ page }) => {
  await page.goto("/community");
  const nav = page.locator("aside .lg\\:block");
  const general = nav.locator('a[href="/community/cohort-01-general"]');
  await expect(general.locator("span.bg-accent")).toBeVisible();
  await general.click();
  await expect(main(page).getByText("New", { exact: true }).first()).toBeVisible();
  // Recording the visit is a background request; let it finish before leaving.
  await page.waitForLoadState("networkidle");
  await page.goto("/community");
  await expect(page.locator('aside .lg\\:block a[href="/community/cohort-01-general"] span.bg-accent')).toHaveCount(0);
});

test("students can read announcements but not post there", async ({ page }) => {
  await page.goto("/community/cohort-01-announcements");
  await expect(main(page)).toContainText("Only instructors post here");
});

test("user content is shown as text, never run as code", async ({ page }) => {
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.dismiss();
  });
  await page.goto("/community/cohort-01-general");
  await newPost(page, "<img src=x onerror=alert(1)>", "<script>alert(2)</script>");
  await expect(main(page)).toContainText("<script>alert(2)</script>");
  expect(dialogs).toBe(0);
});

test("a cohort's private spaces are invisible to people outside it", async ({ as }) => {
  const samira = await as("samira");
  const res = await samira.goto("/community/cohort-01-general");
  expect(res?.status()).toBe(404);
});
