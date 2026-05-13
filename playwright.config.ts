import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Dayforma e2e flows.
 *
 * Scope is intentionally small: three specs covering auth, NL parse + Undo,
 * and the voice button — enough to mirror the manual regression checklist
 * for issue #41 without growing into a full CI suite. CI wiring lives in a
 * separate PR per the issue scope.
 *
 * Run locally:
 *   npm install
 *   npx playwright install chromium     # one-time browser download
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/e2e/test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? "github"
    : [
        ["list"],
        ["html", { outputFolder: "tests/e2e/playwright-report", open: "never" }],
      ],
  use: {
    baseURL: "http://localhost:5173/CSC-710-AI-Calendar/",
    trace: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/CSC-710-AI-Calendar/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
