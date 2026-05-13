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
 * stripping random tokens. We also cannot rely on a single global "before"
 * baseline because the Supabase realtime subscription streams in existing
 * rows asynchronously — they may arrive *after* the test starts. Instead we
 * track the peak count observed once the toast appears, then verify Undo
 * drops the count by at least one from that peak.
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

    // ≥ 10 chars + temporal token + event noun → looksLikeNL → AI route.
    const nlTodo = "team standup tomorrow at 9am";
    await todoInput.fill(nlTodo);
    await todoInput.press("Enter");

    // The AI panel opens with the message queued. Sonner mounts toasts as
    // <li data-sonner-toast> inside an <ol>. Accept either "Event created"
    // or "Todo created" — the model occasionally chooses `create_todo` even
    // for temporal inputs and either is a valid mutation for this flow.
    const toast = page
      .locator("li[data-sonner-toast]")
      .filter({ hasText: /(event|todo) created/i });
    await expect(toast).toBeVisible({ timeout: 15_000 });

    const undoButton = toast.getByRole("button", { name: /undo/i });
    await expect(undoButton).toBeVisible({ timeout: 5_000 });

    // Snapshot the peak count *after* the toast appears and the realtime
    // channel has had a moment to surface both the new row and any stale
    // rows left over from prior local runs. The peak is our reference point
    // for the post-Undo delta assertion below.
    await page.waitForTimeout(1_000);
    const peakCount = await standupEvents.count();

    await undoButton.click();

    // After Undo, the count must drop by at least one from the observed peak.
    // (We don't assert == 0 because prior local runs may have left rows that
    // aren't tied to this specific test invocation.)
    await expect
      .poll(async () => standupEvents.count(), { timeout: 15_000 })
      .toBeLessThan(peakCount);
  });
});
