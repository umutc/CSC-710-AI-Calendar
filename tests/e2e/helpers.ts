import type { Page } from "@playwright/test";

/**
 * Resolve test credentials, preferring env vars so a grader can plug in their
 * own Dayforma account without editing source. Defaults match the demo
 * account documented in CLAUDE.md / the project README.
 */
export function getTestCreds() {
  return {
    email: process.env.E2E_EMAIL ?? "05umutcelik@gmail.com",
    password: process.env.E2E_PASSWORD ?? "12345678",
  };
}

/**
 * Drive the LoginPage form by its stable `id`s and submit. Every spec needs
 * an authenticated dashboard, so this is the shared entry point.
 *
 * `page.goto("login")` is relative so the Vite `base` prefix
 * (`/CSC-710-AI-Calendar/`) from `baseURL` is preserved — an absolute
 * `/login` would replace the prefix and 404 the SPA.
 */
export async function signIn(page: Page): Promise<void> {
  const { email, password } = getTestCreds();
  await page.goto("login");
  await page.waitForLoadState("networkidle");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("#login-submit-btn").click();
  // ProtectedRoute shows a loading spinner while auth resolves, so wait for
  // both the dashboard URL and the hero heading before letting callers move on.
  await page.waitForURL(/\/dashboard\b/, { timeout: 15_000 });
  await page
    .getByRole("heading", { level: 1, name: /your day, mapped and movable/i })
    .waitFor({ timeout: 15_000 });
}
