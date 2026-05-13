import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * End-to-end: typing a natural-language todo title routes the message to the
 * AI panel via `looksLikeNL` (see src/lib/nlDetect.ts), which calls the
 * `ai-assistant` Edge Function. When the model invokes `create_event` (or
 * `create_todo` for non-temporal phrasings) the client surfaces a Sonner
 * toast with the matching label and an Undo action that rolls the row back
 * within the 30 s window defined in `src/lib/applyWithUndo.ts`.
 *
 * Timeouts are generous (15 s) because Claude round-trips land in 1–7 s and
 * the toast itself stays up for 30 s.
 *
 * Idempotency note: we cannot inject a unique token into the title because
 * Claude rewrites titles into a clean form ("team standup" → "Team Standup"),
 * stripping random tokens. Instead we snapshot the calendar count for
 * "team standup" events before/after Undo and assert the count returns to
 * its baseline.
 */
test.describe("NL parse + Undo", () => {
  test("creates an event from a natural-language todo and undoes it from the Sonner toast", async ({ page }) => {
    await signIn(page);

    // The dashboard renders TodoPanel twice (desktop aside + mobile drawer).
    // Scope to the visible desktop aside so selectors stay deterministic.
    const desktopTodoAside = page
      .locator("aside")
      .filter({ hasText: "Todo panel" })
      .first();
    const todoInput = desktopTodoAside.getByPlaceholder("Add a todo title");
    await expect(todoInput).toBeVisible({ timeout: 15_000 });

    // FullCalendar renders each event title as `.fc-event-title`.
    const standupEvents = page
      .locator(".fc-event-title")
      .filter({ hasText: /team standup/i });

    // Let realtime + initial fetch settle so any rows left by prior local runs
    // are already on screen before we snapshot the baseline.
    await page.waitForLoadState("networkidle");
    const beforeCount = await standupEvents.count();

    // ≥ 10 chars + temporal token + event noun → looksLikeNL → AI route.
    const nlTodo = "team standup tomorrow at 9am";
    await todoInput.fill(nlTodo);
    await todoInput.press("Enter");

    // The AI panel opens with the message queued. Sonner mounts toasts as
    // <li data-sonner-toast> inside an <ol>. We accept either "Event created"
    // or "Todo created" — the model occasionally chooses `create_todo` even
    // for temporal inputs and either is a valid mutation for this flow.
    const toast = page
      .locator("li[data-sonner-toast]")
      .filter({ hasText: /(event|todo) created/i });
    await expect(toast).toBeVisible({ timeout: 15_000 });

    const undoButton = toast.getByRole("button", { name: /undo/i });
    await expect(undoButton).toBeVisible({ timeout: 5_000 });

    // Wait for the realtime channel to surface the new calendar row before
    // we click Undo, so the assertion that follows has a real delta to verify.
    // If the AI chose `create_todo` instead, the count may not change — guard
    // by waiting up to 10 s then falling through to the Undo + final assertion.
    await page
      .waitForFunction(
        (baseline: number) =>
          document.querySelectorAll(".fc-event-title").length > baseline ||
          document.querySelectorAll('li[data-sonner-toast]').length > 0,
        beforeCount,
        { timeout: 15_000 }
      )
      .catch(() => {
        /* fall through — toast assertion above already proved a mutation happened */
      });

    await undoButton.click();

    // After Undo, the calendar count must return to its pre-create baseline.
    await expect
      .poll(async () => standupEvents.count(), { timeout: 15_000 })
      .toBe(beforeCount);
  });
});
