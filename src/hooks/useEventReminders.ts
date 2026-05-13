import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Event } from "../types";

/**
 * Maximum lookahead window — only events whose reminder fires within this
 * many milliseconds from "now" are scheduled. 24 hours keeps the timeout
 * table small (setTimeout can hold thousands of timers, but no need).
 */
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

/**
 * Re-scan the events list every 6 hours so events that crossed into the
 * 24-hour window get picked up without requiring a page refresh.
 */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Build a friendly "Today at 3:45 PM" / "Tomorrow at 9:00 AM" body line.
 */
function niceTimeString(date: Date): string {
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  if (isSameDay) return `Today at ${format(date, "h:mm a")}`;
  if (isTomorrow) return `Tomorrow at ${format(date, "h:mm a")}`;
  return format(date, "EEE MMM d, h:mm a");
}

function clearAllTimers(map: Map<string, number>) {
  for (const handle of map.values()) {
    window.clearTimeout(handle);
  }
  map.clear();
}

/**
 * useEventReminders
 *
 * Schedules a browser `Notification` for each upcoming event with a
 * `reminder_offset_minutes` value. Side-effect only — returns nothing.
 *
 * - Only schedules when `permission === "granted"`.
 * - Skips events whose reminder time has already passed.
 * - Caps lookahead at 24h so we don't queue thousands of `setTimeout`s.
 * - Tracks which events have already fired in a `Set` ref so each event
 *   notifies at most once per page session.
 * - Re-runs whenever the `events` array or `permission` changes, and also
 *   on a 6-hour interval to pick up further-out events.
 *
 * Cleanup: on unmount (and before each re-schedule), every queued
 * `setTimeout` is cleared. The refresh `setInterval` is cleared on unmount.
 */
export function useEventReminders(
  events: Event[],
  permission: NotificationPermission | "unsupported"
) {
  // Map from event-id → timeout handle. Lets us cancel pending timers when
  // the events list changes or the component unmounts.
  const timersRef = useRef<Map<string, number>>(new Map());
  // Tracks event ids that have already fired this session, so the same
  // reminder never goes off twice (e.g. if the events array is rebuilt).
  const sentRef = useRef<Set<string>>(new Set());
  // Tick counter — incrementing it triggers a re-run of the scheduling
  // effect, which is how the 6-hour refresh interval works.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (permission !== "granted") {
      // No permission → cancel anything previously queued and bail.
      clearAllTimers(timersRef.current);
      return;
    }
    if (typeof Notification === "undefined") return;

    const now = Date.now();
    const horizon = now + LOOKAHEAD_MS;

    // Reset any previously scheduled timers — we re-compute from the current
    // events list each pass to keep the timer map in sync with the source.
    clearAllTimers(timersRef.current);

    for (const ev of events) {
      const offset = ev.reminder_offset_minutes;
      if (offset === null || offset === undefined) continue;

      // Skip events we've already notified about in this session.
      if (sentRef.current.has(ev.id)) continue;

      let startMs: number;
      try {
        startMs = parseISO(ev.start_at).getTime();
      } catch {
        continue;
      }
      if (Number.isNaN(startMs)) continue;

      const fireAt = startMs - offset * 60 * 1000;
      const delay = fireAt - now;

      // Already past — don't fire stale notifications.
      if (delay <= 0) continue;
      // Beyond our lookahead window — the 6-hour interval will catch it.
      if (fireAt > horizon) continue;

      const evId = ev.id;
      const title = ev.title;
      const start = new Date(startMs);

      const handle = window.setTimeout(() => {
        // Permission could have been revoked while we waited.
        if (typeof Notification === "undefined") return;
        if (Notification.permission !== "granted") return;
        // Guard double-fire (defensive — the Set should keep us honest).
        if (sentRef.current.has(evId)) return;

        try {
          const notification = new Notification(title, {
            body: niceTimeString(start),
            tag: evId,
          });
          // Optional click-to-focus. Wrapped — some browsers don't honour
          // this and we don't want to break the timer if it throws.
          notification.onclick = () => {
            try {
              window.focus();
              notification.close();
            } catch {
              /* ignore */
            }
          };
        } catch (err) {
          // Notification constructor can throw if the user disabled them
          // mid-session; swallow it so the rest of the timers keep working.
          console.warn("Failed to dispatch reminder notification:", err);
        }
        sentRef.current.add(evId);
        timersRef.current.delete(evId);
      }, delay);

      timersRef.current.set(evId, handle);
    }

    return () => {
      clearAllTimers(timersRef.current);
    };
  }, [events, permission, refreshTick]);

  // Daily-ish refresh: re-run the scheduling pass every 6 hours so events
  // that were beyond the 24h window earlier get queued once they're inside.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (permission !== "granted") return;
    const id = window.setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [permission]);
}
