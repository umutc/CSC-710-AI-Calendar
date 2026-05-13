// Pure gap-finder algorithm for the AI assistant's `find_free_time` tool.
//
// IMPORTANT: this file MUST stay byte-identical to
// `supabase/functions/ai-assistant/findFreeTime.ts`. The Supabase Edge
// Function deploy only uploads files inside that directory, so we cannot
// relative-import out into `src/`. The Vitest copy lives here because the
// Edge Function module imports Deno-only specifiers and can't be loaded
// from Node. Keep them in sync.
//
// Semantics:
//   * The search window is `[windowStart, windowEnd)`.
//   * An "event" is anything in `events` with an `start_at`/`end_at` that
//     OVERLAPS the window — callers MUST clip / pre-filter so that any
//     event with `end_at > windowStart && start_at < windowEnd` is passed
//     in. The algorithm itself is timezone-agnostic; comparisons are made
//     on `Date.getTime()`.
//   * A slot is emitted whenever the cursor has at least `durationMs` of
//     uninterrupted free time before the next event starts (or before the
//     window ends).
//   * Slots NEVER overlap any input event (this is the property the bug
//     in #79 violated).

export interface FreeTimeEvent {
  start_at: string;
  end_at: string;
}

export interface FreeTimeWindow {
  /** ISO-8601 timestamp marking the earliest acceptable slot start. */
  windowStart: string;
  /** ISO-8601 timestamp marking the latest acceptable slot end. */
  windowEnd: string;
  /** Required slot length in minutes. */
  durationMinutes: number;
}

export interface FreeTimeSlot {
  start: string;
  end: string;
}

/**
 * Returns the non-overlapping free slots of length `durationMinutes` inside
 * the search window, given the (possibly unsorted) list of busy events.
 *
 * The algorithm sorts by `start_at`, clips each event to the search window,
 * skips events that don't intersect the window, and emits a slot whenever
 * `cursor + duration` fits before the next event (or before the window
 * end).
 */
export function findFreeSlots(
  events: readonly FreeTimeEvent[],
  window: FreeTimeWindow
): FreeTimeSlot[] {
  const windowStartMs = new Date(window.windowStart).getTime();
  const windowEndMs = new Date(window.windowEnd).getTime();
  const durationMs = window.durationMinutes * 60 * 1000;

  if (!Number.isFinite(windowStartMs) || !Number.isFinite(windowEndMs)) {
    return [];
  }
  if (windowEndMs - windowStartMs < durationMs) return [];

  // Normalise: keep only events that intersect the window, clip them to
  // the window, then sort by start time. Clipping ensures an event that
  // starts before the window (e.g. yoga 11:30–12:30 vs window 12:00–17:00)
  // still blocks the cursor at the window start.
  const clipped = events
    .map((ev) => {
      const startMs = new Date(ev.start_at).getTime();
      const endMs = new Date(ev.end_at).getTime();
      return { startMs, endMs };
    })
    .filter(
      ({ startMs, endMs }) =>
        Number.isFinite(startMs) &&
        Number.isFinite(endMs) &&
        endMs > startMs &&
        endMs > windowStartMs &&
        startMs < windowEndMs
    )
    .map(({ startMs, endMs }) => ({
      startMs: Math.max(startMs, windowStartMs),
      endMs: Math.min(endMs, windowEndMs),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const slots: FreeTimeSlot[] = [];
  let cursorMs = windowStartMs;

  for (const ev of clipped) {
    // Only emit a slot when the FULL duration fits BEFORE this event
    // starts. The previous bug: when the next event starts inside the
    // proposed slot, the algorithm would still record the slot.
    if (ev.startMs - cursorMs >= durationMs) {
      slots.push({
        start: new Date(cursorMs).toISOString(),
        end: new Date(cursorMs + durationMs).toISOString(),
      });
    }
    if (ev.endMs > cursorMs) cursorMs = ev.endMs;
  }

  if (windowEndMs - cursorMs >= durationMs) {
    slots.push({
      start: new Date(cursorMs).toISOString(),
      end: new Date(cursorMs + durationMs).toISOString(),
    });
  }

  return slots;
}
