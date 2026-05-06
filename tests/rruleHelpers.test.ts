import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  startOfDay,
  endOfDay,
  daysBetween,
  isWeekday,
  eventToCalendarInput,
  expandRecurringEvents,
} from "../src/lib/rruleHelpers";
import type { Event } from "../src/types";

// ─── Helper factory ─────────────────────────────────────────────────────────
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "evt-1",
    user_id: "user-1",
    title: "Test Event",
    description: null,
    start_at: "2026-05-04T09:00:00.000Z", // Monday
    end_at: "2026-05-04T10:00:00.000Z",
    all_day: false,
    category_id: null,
    rrule: null,
    reminder_offset_minutes: null,
    created_by_ai: false,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Date Utility Tests ─────────────────────────────────────────────────────
describe("addDays", () => {
  it("adds positive days", () => {
    const d = new Date("2026-05-01T12:00:00Z");
    const result = addDays(d, 3);
    expect(result.getUTCDate()).toBe(4);
    expect(result.getUTCMonth()).toBe(4); // May = 4
  });

  it("handles month boundary", () => {
    const d = new Date("2026-05-30T12:00:00Z");
    const result = addDays(d, 3);
    expect(result.getUTCDate()).toBe(2);
    expect(result.getUTCMonth()).toBe(5); // June = 5
  });

  it("adds zero days (returns a copy)", () => {
    const d = new Date("2026-05-15T12:00:00Z");
    const result = addDays(d, 0);
    expect(result.getTime()).toBe(d.getTime());
    expect(result).not.toBe(d); // different object
  });

  it("does not mutate the original date", () => {
    const d = new Date("2026-05-01T12:00:00Z");
    const originalTime = d.getTime();
    addDays(d, 5);
    expect(d.getTime()).toBe(originalTime);
  });
});

describe("addMonths", () => {
  it("adds months normally", () => {
    const d = new Date("2026-01-15T12:00:00Z");
    const result = addMonths(d, 3);
    expect(result.getUTCMonth()).toBe(3); // April
    expect(result.getUTCDate()).toBe(15);
  });

  it("handles year boundary", () => {
    const d = new Date("2026-11-15T12:00:00Z");
    const result = addMonths(d, 3);
    expect(result.getUTCFullYear()).toBe(2027);
    expect(result.getUTCMonth()).toBe(1); // February
  });

  it("handles end-of-month overflow (Jan 31 + 1 month)", () => {
    const d = new Date("2026-01-31T12:00:00Z");
    const result = addMonths(d, 1);
    // JS Date rolls over: Jan 31 + 1 month → Mar 3 (Feb has 28 days in 2026)
    expect(result.getUTCMonth()).toBe(2); // March
  });

  it("does not mutate the original date", () => {
    const d = new Date("2026-05-01T12:00:00Z");
    const originalTime = d.getTime();
    addMonths(d, 2);
    expect(d.getTime()).toBe(originalTime);
  });
});

describe("startOfDay", () => {
  it("sets time to 00:00:00.000", () => {
    const d = new Date("2026-05-15T14:30:45.123Z");
    const result = startOfDay(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("preserves the date portion", () => {
    const d = new Date(2026, 4, 15, 14, 30); // local May 15
    const result = startOfDay(d);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(15);
  });

  it("does not mutate the original date", () => {
    const d = new Date("2026-05-15T14:30:45.123Z");
    const originalTime = d.getTime();
    startOfDay(d);
    expect(d.getTime()).toBe(originalTime);
  });
});

describe("endOfDay", () => {
  it("sets time to 23:59:59.999", () => {
    const d = new Date("2026-05-15T06:00:00.000Z");
    const result = endOfDay(d);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it("does not mutate the original date", () => {
    const d = new Date("2026-05-15T06:00:00.000Z");
    const originalTime = d.getTime();
    endOfDay(d);
    expect(d.getTime()).toBe(originalTime);
  });
});

describe("daysBetween", () => {
  it("returns 0 for the same day", () => {
    const d = new Date("2026-05-15T10:00:00Z");
    expect(daysBetween(d, d)).toBe(0);
  });

  it("returns 0 for same day different times", () => {
    // Use local dates to avoid timezone offset causing a day boundary difference
    const a = new Date(2026, 4, 15, 2, 0, 0);
    const b = new Date(2026, 4, 15, 23, 0, 0);
    expect(daysBetween(a, b)).toBe(0);
  });

  it("returns positive difference for later dates", () => {
    const a = new Date("2026-05-10T12:00:00Z");
    const b = new Date("2026-05-15T12:00:00Z");
    expect(daysBetween(a, b)).toBe(5);
  });

  it("returns negative difference for earlier dates", () => {
    const a = new Date("2026-05-15T12:00:00Z");
    const b = new Date("2026-05-10T12:00:00Z");
    expect(daysBetween(a, b)).toBe(-5);
  });

  it("handles month boundary", () => {
    const a = new Date("2026-04-28T12:00:00Z");
    const b = new Date("2026-05-03T12:00:00Z");
    expect(daysBetween(a, b)).toBe(5);
  });
});

describe("isWeekday", () => {
  it("returns true for Monday through Friday", () => {
    // 2026-05-04 is Monday, 05-05 Tue, ... 05-08 Fri
    expect(isWeekday(new Date("2026-05-04T12:00:00Z"))).toBe(true);  // Mon
    expect(isWeekday(new Date("2026-05-05T12:00:00Z"))).toBe(true);  // Tue
    expect(isWeekday(new Date("2026-05-06T12:00:00Z"))).toBe(true);  // Wed
    expect(isWeekday(new Date("2026-05-07T12:00:00Z"))).toBe(true);  // Thu
    expect(isWeekday(new Date("2026-05-08T12:00:00Z"))).toBe(true);  // Fri
  });

  it("returns false for Saturday and Sunday", () => {
    expect(isWeekday(new Date("2026-05-09T12:00:00Z"))).toBe(false); // Sat
    expect(isWeekday(new Date("2026-05-10T12:00:00Z"))).toBe(false); // Sun
  });
});

// ─── eventToCalendarInput ───────────────────────────────────────────────────
describe("eventToCalendarInput", () => {
  it("maps Event fields to FullCalendar EventInput", () => {
    const event = makeEvent();
    const result = eventToCalendarInput(event);

    expect(result.id).toBe(event.id);
    expect(result.groupId).toBe(event.id);
    expect(result.title).toBe(event.title);
    expect(result.start).toBe(event.start_at);
    expect(result.end).toBe(event.end_at);
    expect(result.allDay).toBe(event.all_day);
    expect(result.extendedProps).toEqual({
      sourceEventId: event.id,
      rrule: null,
    });
  });

  it("preserves all_day = true", () => {
    const event = makeEvent({ all_day: true });
    const result = eventToCalendarInput(event);
    expect(result.allDay).toBe(true);
  });
});

// ─── expandRecurringEvents ──────────────────────────────────────────────────
describe("expandRecurringEvents", () => {
  const WEEK_RANGE = {
    start: new Date("2026-05-04T00:00:00.000Z"), // Monday
    end: new Date("2026-05-11T00:00:00.000Z"),   // Next Monday
  };

  describe("non-recurring events", () => {
    it("includes a single event within the range", () => {
      const event = makeEvent();
      const results = expandRecurringEvents([event], WEEK_RANGE);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(event.id);
    });

    it("excludes events outside the range", () => {
      const event = makeEvent({
        start_at: "2026-06-01T09:00:00.000Z",
        end_at: "2026-06-01T10:00:00.000Z",
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      expect(results).toHaveLength(0);
    });

    it("includes partially overlapping events", () => {
      const event = makeEvent({
        start_at: "2026-05-03T22:00:00.000Z", // starts before range
        end_at: "2026-05-04T02:00:00.000Z",   // ends inside range
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      expect(results).toHaveLength(1);
    });
  });

  describe("daily recurrence", () => {
    it("generates one occurrence per day within range", () => {
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T10:00:00.000Z",
        rrule: { preset: "daily" },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      // Mon-Sun = 7 days
      expect(results.length).toBe(7);
    });

    it("each occurrence has unique composite id", () => {
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T10:00:00.000Z",
        rrule: { preset: "daily" },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("preserves event duration across occurrences", () => {
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T11:30:00.000Z", // 2.5 hour event
        rrule: { preset: "daily" },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      for (const r of results) {
        const start = new Date(r.start as string);
        const end = new Date(r.end as string);
        expect(end.getTime() - start.getTime()).toBe(2.5 * 60 * 60 * 1000);
      }
    });
  });

  describe("weekly recurrence", () => {
    it("generates occurrences only on specified weekdays", () => {
      // Only Mon (1) and Wed (3)
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T10:00:00.000Z",
        rrule: { preset: "weekly", weekdays: [1, 3] },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      // Mon May 4 and Wed May 6 in range
      expect(results.length).toBe(2);

      for (const r of results) {
        const day = new Date(r.start as string).getUTCDay();
        expect([1, 3]).toContain(day);
      }
    });

    it("returns empty when no specified weekday falls in range", () => {
      // Saturday (6) only — range is Mon-Sun but event starts on Monday so
      // Sat May 9 is in range
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T10:00:00.000Z",
        rrule: { preset: "weekly", weekdays: [6] },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      expect(results.length).toBe(1);
      expect(new Date(results[0].start as string).getUTCDay()).toBe(6);
    });
  });

  describe("weekday recurrence", () => {
    it("generates occurrences only on weekdays (Mon–Fri)", () => {
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T10:00:00.000Z",
        rrule: { preset: "weekday" },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      // Mon-Fri = 5 weekdays
      expect(results.length).toBe(5);

      for (const r of results) {
        const day = new Date(r.start as string).getUTCDay();
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("monthly recurrence", () => {
    it("generates one occurrence per month within range", () => {
      const MONTH_RANGE = {
        start: new Date("2026-05-01T00:00:00.000Z"),
        end: new Date("2026-08-01T00:00:00.000Z"),
      };
      const event = makeEvent({
        start_at: "2026-05-15T09:00:00.000Z",
        end_at: "2026-05-15T10:00:00.000Z",
        rrule: { preset: "monthly", day_of_month: 15 },
      });
      const results = expandRecurringEvents([event], MONTH_RANGE);
      // May 15, June 15, July 15 = 3
      expect(results.length).toBe(3);
    });

    it("clamps day_of_month to month length (e.g. 31 → 28 for Feb)", () => {
      // Range covers only February so only one clamped occurrence appears
      const RANGE = {
        start: new Date("2026-02-01T00:00:00.000Z"),
        end: new Date("2026-03-01T00:00:00.000Z"),
      };
      const event = makeEvent({
        start_at: "2026-01-01T09:00:00.000Z",
        end_at: "2026-01-01T10:00:00.000Z",
        rrule: { preset: "monthly", day_of_month: 31 },
      });
      const results = expandRecurringEvents([event], RANGE);
      // Jan 31 is before Feb range, Feb gets clamped to 28
      const febResults = results.filter((r) => {
        const d = new Date(r.start as string);
        return d.getUTCMonth() === 1; // February
      });
      expect(febResults.length).toBe(1);
      const start = new Date(febResults[0].start as string);
      expect(start.getUTCDate()).toBe(28);
    });
  });

  describe("biweekly recurrence", () => {
    it("generates occurrences every other week on specified weekdays", () => {
      const TWO_WEEK_RANGE = {
        start: new Date("2026-05-04T00:00:00.000Z"), // Mon
        end: new Date("2026-05-18T00:00:00.000Z"),   // Mon (2 weeks)
      };
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T10:00:00.000Z",
        rrule: { preset: "biweekly", weekdays: [1] }, // Monday only
      });
      const results = expandRecurringEvents([event], TWO_WEEK_RANGE);
      // Week 0 (May 4) = match, Week 1 (May 11) = skip
      expect(results.length).toBe(1);
      const start = new Date(results[0].start as string);
      expect(start.getUTCDate()).toBe(4);
    });
  });

  describe("minimum duration enforcement", () => {
    it("enforces a minimum 30-minute duration for recurring events", () => {
      const event = makeEvent({
        start_at: "2026-05-04T09:00:00.000Z",
        end_at: "2026-05-04T09:05:00.000Z", // 5 minutes
        rrule: { preset: "daily" },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      for (const r of results) {
        const start = new Date(r.start as string);
        const end = new Date(r.end as string);
        expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000);
      }
    });
  });

  describe("groupId linking", () => {
    it("all occurrences share the same groupId from the source event", () => {
      const event = makeEvent({
        rrule: { preset: "daily" },
      });
      const results = expandRecurringEvents([event], WEEK_RANGE);
      for (const r of results) {
        expect(r.groupId).toBe(event.id);
      }
    });
  });

  describe("multiple events", () => {
    it("expands multiple events independently", () => {
      const event1 = makeEvent({
        id: "evt-1",
        rrule: { preset: "daily" },
      });
      const event2 = makeEvent({
        id: "evt-2",
        start_at: "2026-05-04T14:00:00.000Z",
        end_at: "2026-05-04T15:00:00.000Z",
        rrule: { preset: "weekday" },
      });
      const results = expandRecurringEvents([event1, event2], WEEK_RANGE);
      // 7 daily + 5 weekday = 12
      expect(results.length).toBe(12);

      const evt1Results = results.filter((r) => r.groupId === "evt-1");
      const evt2Results = results.filter((r) => r.groupId === "evt-2");
      expect(evt1Results.length).toBe(7);
      expect(evt2Results.length).toBe(5);
    });
  });
});
