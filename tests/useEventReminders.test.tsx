import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEventReminders } from "../src/hooks/useEventReminders";
import type { Event } from "../src/types";

const REAL_NOTIFICATION = (globalThis as { Notification?: unknown }).Notification;

function buildEvent(overrides: Partial<Event> = {}): Event {
  const base: Event = {
    id: "evt-1",
    user_id: "user-1",
    title: "Standup",
    description: null,
    start_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    end_at: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    all_day: false,
    category_id: null,
    rrule: null,
    reminder_offset_minutes: 0,
    created_by_ai: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return { ...base, ...overrides };
}

let constructed: { title: string; body?: string; tag?: string }[] = [];

class FakeNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  public onclick: (() => void) | null = null;
  constructor(public title: string, public options?: NotificationOptions) {
    constructed.push({ title, body: options?.body, tag: options?.tag });
  }
  close() {
    /* noop */
  }
}

describe("useEventReminders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    constructed = [];
    (globalThis as unknown as { Notification: unknown }).Notification =
      FakeNotification;
    FakeNotification.permission = "granted";
  });

  afterEach(() => {
    vi.useRealTimers();
    if (REAL_NOTIFICATION === undefined) {
      delete (globalThis as unknown as { Notification?: unknown }).Notification;
    } else {
      (globalThis as unknown as { Notification: unknown }).Notification =
        REAL_NOTIFICATION;
    }
  });

  it("does nothing when permission is not granted", () => {
    const fireIn = 2 * 60 * 1000; // 2 minutes
    const ev = buildEvent({
      start_at: new Date(Date.now() + fireIn).toISOString(),
      reminder_offset_minutes: 0,
    });

    renderHook(() => useEventReminders([ev], "default"));
    vi.advanceTimersByTime(fireIn + 10);

    expect(constructed.length).toBe(0);
  });

  it("schedules a notification at the offset boundary when granted", () => {
    const fireIn = 2 * 60 * 1000;
    const ev = buildEvent({
      start_at: new Date(Date.now() + fireIn).toISOString(),
      reminder_offset_minutes: 0,
      title: "Quick chat",
    });

    renderHook(() => useEventReminders([ev], "granted"));
    expect(constructed.length).toBe(0);

    vi.advanceTimersByTime(fireIn + 10);

    expect(constructed.length).toBe(1);
    expect(constructed[0].title).toBe("Quick chat");
    expect(constructed[0].tag).toBe(ev.id);
  });

  it("skips events whose reminder has already passed", () => {
    const ev = buildEvent({
      start_at: new Date(Date.now() - 60 * 1000).toISOString(),
      reminder_offset_minutes: 0,
    });

    renderHook(() => useEventReminders([ev], "granted"));
    vi.advanceTimersByTime(60 * 1000);

    expect(constructed.length).toBe(0);
  });

  it("skips events without a reminder offset", () => {
    const ev = buildEvent({
      start_at: new Date(Date.now() + 60 * 1000).toISOString(),
      reminder_offset_minutes: null,
    });

    renderHook(() => useEventReminders([ev], "granted"));
    vi.advanceTimersByTime(2 * 60 * 1000);

    expect(constructed.length).toBe(0);
  });

  it("does not fire the same event twice across re-renders", () => {
    const fireIn = 2 * 60 * 1000;
    const ev = buildEvent({
      start_at: new Date(Date.now() + fireIn).toISOString(),
      reminder_offset_minutes: 0,
    });

    const { rerender } = renderHook(
      ({ events }: { events: Event[] }) => useEventReminders(events, "granted"),
      { initialProps: { events: [ev] } }
    );

    vi.advanceTimersByTime(fireIn + 10);
    expect(constructed.length).toBe(1);

    // Re-render with a new array containing the same event — should NOT
    // re-fire the same notification.
    rerender({ events: [{ ...ev }] });
    vi.advanceTimersByTime(fireIn + 10);
    expect(constructed.length).toBe(1);
  });

  it("skips events whose reminder is beyond the 24h lookahead window", () => {
    const dayPlus = 25 * 60 * 60 * 1000;
    const ev = buildEvent({
      start_at: new Date(Date.now() + dayPlus).toISOString(),
      reminder_offset_minutes: 0,
    });

    renderHook(() => useEventReminders([ev], "granted"));
    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

    expect(constructed.length).toBe(0);
  });
});
