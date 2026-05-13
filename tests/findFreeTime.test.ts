import { describe, expect, it } from "vitest";
import { findFreeSlots, type FreeTimeEvent } from "../src/lib/findFreeTime";

// All timestamps in these tests use the same offset ("Z") so the comparison
// is purely on getTime(); the algorithm is timezone-agnostic by design.

function noOverlap(slot: { start: string; end: string }, events: FreeTimeEvent[]) {
  const sMs = new Date(slot.start).getTime();
  const eMs = new Date(slot.end).getTime();
  return events.every((ev) => {
    const evStart = new Date(ev.start_at).getTime();
    const evEnd = new Date(ev.end_at).getTime();
    return eMs <= evStart || sMs >= evEnd;
  });
}

describe("findFreeSlots", () => {
  it("regression #79: 2h slot after 12:00 with lunch at 12:30-13:30 does NOT overlap lunch", () => {
    // The exact scenario from issue #79.
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T10:00:00Z", end_at: "2026-05-14T10:30:00Z" },
      { start_at: "2026-05-14T12:30:00Z", end_at: "2026-05-14T13:30:00Z" },
    ];

    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T12:00:00Z",
      windowEnd: "2026-05-14T17:00:00Z",
      durationMinutes: 120,
    });

    // Every slot must be free of the lunch event.
    for (const slot of slots) expect(noOverlap(slot, events)).toBe(true);

    // And specifically the first proposed slot must not be 12:00-14:00.
    expect(slots[0]?.start).not.toBe("2026-05-14T12:00:00.000Z");
  });

  it("regression #79: event that STRADDLES the window start blocks the cursor", () => {
    // The deeper bug behind #79 — an event that begins BEFORE windowStart but
    // extends into the window was being dropped by the over-restrictive
    // `gte('start_at', dayStart)` filter on the Edge Function side. The pure
    // helper must handle this when callers pass overlapping events through.
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T11:30:00Z", end_at: "2026-05-14T12:30:00Z" }, // yoga
    ];

    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T12:00:00Z",
      windowEnd: "2026-05-14T17:00:00Z",
      durationMinutes: 120,
    });

    for (const slot of slots) expect(noOverlap(slot, events)).toBe(true);
    expect(slots[0]).toEqual({
      start: "2026-05-14T12:30:00.000Z",
      end: "2026-05-14T14:30:00.000Z",
    });
  });

  it("emits the gap before the first event when it is wide enough", () => {
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T10:00:00Z", end_at: "2026-05-14T10:30:00Z" },
      { start_at: "2026-05-14T12:30:00Z", end_at: "2026-05-14T13:30:00Z" },
    ];

    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T09:00:00Z",
      windowEnd: "2026-05-14T18:00:00Z",
      durationMinutes: 120,
    });

    // 10:30 → 12:30 (2h) and 13:30 → 15:30 (2h).
    expect(slots).toEqual([
      { start: "2026-05-14T10:30:00.000Z", end: "2026-05-14T12:30:00.000Z" },
      { start: "2026-05-14T13:30:00.000Z", end: "2026-05-14T15:30:00.000Z" },
    ]);
    for (const slot of slots) expect(noOverlap(slot, events)).toBe(true);
  });

  it("returns the whole window when there are no events", () => {
    const slots = findFreeSlots([], {
      windowStart: "2026-05-14T09:00:00Z",
      windowEnd: "2026-05-14T18:00:00Z",
      durationMinutes: 60,
    });
    expect(slots).toEqual([
      { start: "2026-05-14T09:00:00.000Z", end: "2026-05-14T10:00:00.000Z" },
    ]);
  });

  it("returns no slots when duration exceeds window size", () => {
    const slots = findFreeSlots([], {
      windowStart: "2026-05-14T12:00:00Z",
      windowEnd: "2026-05-14T13:00:00Z",
      durationMinutes: 120,
    });
    expect(slots).toEqual([]);
  });

  it("handles unsorted events correctly", () => {
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T15:00:00Z", end_at: "2026-05-14T16:00:00Z" },
      { start_at: "2026-05-14T10:00:00Z", end_at: "2026-05-14T11:00:00Z" },
    ];

    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T09:00:00Z",
      windowEnd: "2026-05-14T18:00:00Z",
      durationMinutes: 120,
    });

    for (const slot of slots) expect(noOverlap(slot, events)).toBe(true);
    expect(slots).toEqual([
      { start: "2026-05-14T11:00:00.000Z", end: "2026-05-14T13:00:00.000Z" },
      { start: "2026-05-14T16:00:00.000Z", end: "2026-05-14T18:00:00.000Z" },
    ]);
  });

  it("clips an event that extends past the window end", () => {
    // Without the fix, the algorithm would treat the cursor as advancing
    // only up to 17:30 (event end) but the window already ended at 17:00.
    // After clipping, the cursor advances to the window end and no slot is
    // emitted past it.
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T16:30:00Z", end_at: "2026-05-14T17:30:00Z" },
    ];

    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T15:00:00Z",
      windowEnd: "2026-05-14T17:00:00Z",
      durationMinutes: 60,
    });

    expect(slots).toEqual([
      { start: "2026-05-14T15:00:00.000Z", end: "2026-05-14T16:00:00.000Z" },
    ]);
  });

  it("merges back-to-back events without inserting a zero-length slot", () => {
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T10:00:00Z", end_at: "2026-05-14T11:00:00Z" },
      { start_at: "2026-05-14T11:00:00Z", end_at: "2026-05-14T12:00:00Z" },
    ];

    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T09:00:00Z",
      windowEnd: "2026-05-14T14:00:00Z",
      durationMinutes: 60,
    });

    for (const slot of slots) expect(noOverlap(slot, events)).toBe(true);
    // 09:00-10:00, then 12:00-13:00 — never 11:00-11:00 or overlapping.
    expect(slots).toEqual([
      { start: "2026-05-14T09:00:00.000Z", end: "2026-05-14T10:00:00.000Z" },
      { start: "2026-05-14T12:00:00.000Z", end: "2026-05-14T13:00:00.000Z" },
    ]);
  });

  it("ignores events that finish before the window starts", () => {
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T08:00:00Z", end_at: "2026-05-14T09:00:00Z" },
    ];
    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T09:00:00Z",
      windowEnd: "2026-05-14T11:00:00Z",
      durationMinutes: 60,
    });
    expect(slots).toEqual([
      { start: "2026-05-14T09:00:00.000Z", end: "2026-05-14T10:00:00.000Z" },
    ]);
  });

  it("ignores events that start after the window ends", () => {
    const events: FreeTimeEvent[] = [
      { start_at: "2026-05-14T18:00:00Z", end_at: "2026-05-14T19:00:00Z" },
    ];
    const slots = findFreeSlots(events, {
      windowStart: "2026-05-14T09:00:00Z",
      windowEnd: "2026-05-14T18:00:00Z",
      durationMinutes: 60,
    });
    expect(slots[0]).toEqual({
      start: "2026-05-14T09:00:00.000Z",
      end: "2026-05-14T10:00:00.000Z",
    });
  });
});
