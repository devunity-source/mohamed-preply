import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

// The suite runs against a production build on its own port, with demo data
// and a secret-gated reset hook so every test starts from the same seed.
const PORT = 3210;
process.env.E2E_BASE_URL ??= `http://localhost:${PORT}`;
process.env.E2E_TEST_SECRET ??= randomBytes(24).toString("hex");
process.env.E2E_DEMO_PASSWORD ??= "e2e-demo-password";

// Layout checks run at every size; everything else runs once, on desktop.
const LAYOUT = /layout\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  // One server holds all the data, so tests run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    timezoneId: "Asia/Dubai",
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    {
      name: "tablet",
      testMatch: LAYOUT,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "phone",
      testMatch: LAYOUT,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
    url: `${process.env.E2E_BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      E2E_TEST_HOOKS: "1",
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET,
      DEMO_PASSWORD: process.env.E2E_DEMO_PASSWORD,
      ACADEMY_TIMEZONE: "Asia/Dubai",
      // Demo mode, always: set but empty beats a developer's .env.local, so
      // the tests never touch a real Supabase project.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
    },
  },
});
