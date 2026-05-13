import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * End-to-end: sign in with the demo creds and assert the dashboard renders
 * with both the calendar hero and the Todo panel heading visible.
 */
test.describe("auth flow", () => {
  test("signs in with valid creds and lands on /dashboard with the Todo panel visible", async ({ page }) => {
    await signIn(page);

    await expect(page).toHaveURL(/\/dashboard\b/);

    // Calendar side — dashboard hero heading. signIn() already waited on it,
    // but reassert here so this spec fails loudly if the heading regresses.
    await expect(
      page.getByRole("heading", { level: 1, name: /your day, mapped and movable/i })
    ).toBeVisible({ timeout: 15_000 });

    // Todo panel — right-side heading. This is the bullet the issue calls out
    // explicitly ("Todo panel" visible after auth).
    await expect(
      page.getByRole("heading", { level: 2, name: /todo panel/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
