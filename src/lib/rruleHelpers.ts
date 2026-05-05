import type { EventInput } from "@fullcalendar/core";
import type { Event, RRulePreset } from "../types";

export type VisibleRange = {
  start: Date;
  end: Date;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function daysBetween(start: Date, end: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / millisecondsPerDay);
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function buildOccurrence(event: Event, startAt: Date, endAt: Date, occurrenceIndex: number): EventInput {
  return {
    id: `${event.id}::${occurrenceIndex}`,
    groupId: event.id,
    title: event.title,
    start: startAt.toISOString(),
    end: endAt.toISOString(),
    allDay: event.all_day,
    extendedProps: {
      sourceEventId: event.id,
      rrule: event.rrule,
      occurrenceIndex,
    },
  };
}

function expandDaily(event: Event, range: VisibleRange, durationMs: number): EventInput[] {
  const baseStart = new Date(event.start_at);
  const firstOffset = Math.max(0, daysBetween(baseStart, range.start));
  const first = addDays(baseStart, firstOffset);
  const results: EventInput[] = [];

  for (let cursor = first, index = firstOffset; cursor < range.end; cursor = addDays(cursor, 1), index += 1) {
    const occurrenceEnd = new Date(cursor.getTime() + durationMs);
    if (occurrenceEnd > range.start) {
      results.push(buildOccurrence(event, cursor, occurrenceEnd, index));
    }
  }

  return results;
}

function expandWeekly(event: Event, range: VisibleRange, durationMs: number, weekdays: number[]): EventInput[] {
  const baseStart = new Date(event.start_at);
  const allowed = new Set(weekdays);
  const results: EventInput[] = [];
  const cursor = startOfDay(range.start);
  let occurrenceIndex = 0;

  while (cursor < range.end) {
    const candidate = new Date(cursor);
    candidate.setHours(
      baseStart.getHours(),
      baseStart.getMinutes(),
      baseStart.getSeconds(),
      baseStart.getMilliseconds()
    );

    if (candidate >= baseStart && allowed.has(candidate.getDay())) {
      const occurrenceEnd = new Date(candidate.getTime() + durationMs);
      if (occurrenceEnd > range.start) {
        results.push(buildOccurrence(event, candidate, occurrenceEnd, occurrenceIndex));
      }
      occurrenceIndex += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function expandMonthly(event: Event, range: VisibleRange, durationMs: number, dayOfMonth: number): EventInput[] {
  const baseStart = new Date(event.start_at);
  const results: EventInput[] = [];
  let occurrenceIndex = 0;

  for (
    let cursor = new Date(baseStart.getFullYear(), baseStart.getMonth(), 1);
    cursor < range.end;
    cursor = addMonths(cursor, 1)
  ) {
    const candidate = new Date(cursor);
    const maxDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    candidate.setDate(Math.min(dayOfMonth, maxDay));
    candidate.setHours(
      baseStart.getHours(),
      baseStart.getMinutes(),
      baseStart.getSeconds(),
      baseStart.getMilliseconds()
    );

    if (candidate < baseStart) {
      continue;
    }

    const occurrenceEnd = new Date(candidate.getTime() + durationMs);
    if (candidate < range.end && occurrenceEnd > range.start) {
      results.push(buildOccurrence(event, candidate, occurrenceEnd, occurrenceIndex));
    }
    occurrenceIndex += 1;
  }

  return results;
}

function expandWeekday(event: Event, range: VisibleRange, durationMs: number): EventInput[] {
  const baseStart = new Date(event.start_at);
  const results: EventInput[] = [];
  const cursor = startOfDay(range.start);
  let occurrenceIndex = 0;

  while (cursor < range.end) {
    const candidate = new Date(cursor);
    candidate.setHours(
      baseStart.getHours(),
      baseStart.getMinutes(),
      baseStart.getSeconds(),
      baseStart.getMilliseconds()
    );

    if (candidate >= baseStart && isWeekday(candidate)) {
      const occurrenceEnd = new Date(candidate.getTime() + durationMs);
      if (occurrenceEnd > range.start) {
        results.push(buildOccurrence(event, candidate, occurrenceEnd, occurrenceIndex));
      }
      occurrenceIndex += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function expandBiweekly(event: Event, range: VisibleRange, durationMs: number, weekdays: number[]): EventInput[] {
  const baseStart = new Date(event.start_at);
  const allowed = new Set(weekdays);
  const results: EventInput[] = [];
  const cursor = startOfDay(range.start);
  let occurrenceIndex = 0;

  while (cursor < range.end) {
    const candidate = new Date(cursor);
    candidate.setHours(
      baseStart.getHours(),
      baseStart.getMinutes(),
      baseStart.getSeconds(),
      baseStart.getMilliseconds()
    );

    if (candidate >= baseStart && allowed.has(candidate.getDay())) {
      const weekOffset = Math.floor(daysBetween(startOfDay(baseStart), startOfDay(candidate)) / 7);
      if (weekOffset % 2 === 0) {
        const occurrenceEnd = new Date(candidate.getTime() + durationMs);
        if (occurrenceEnd > range.start) {
          results.push(buildOccurrence(event, candidate, occurrenceEnd, occurrenceIndex));
        }
        occurrenceIndex += 1;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function expandPreset(event: Event, range: VisibleRange, durationMs: number, preset: RRulePreset): EventInput[] {
  switch (preset.preset) {
    case "daily":
      return expandDaily(event, range, durationMs);
    case "weekly":
      return expandWeekly(event, range, durationMs, preset.weekdays);
    case "biweekly":
      return expandBiweekly(event, range, durationMs, preset.weekdays);
    case "monthly":
      return expandMonthly(event, range, durationMs, preset.day_of_month);
    case "weekday":
      return expandWeekday(event, range, durationMs);
    default:
      return [];
  }
}

export function eventToCalendarInput(event: Event): EventInput {
  return {
    id: event.id,
    groupId: event.id,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    allDay: event.all_day,
    extendedProps: {
      sourceEventId: event.id,
      rrule: event.rrule,
    },
  };
}

export function expandRecurringEvents(events: Event[], range: VisibleRange): EventInput[] {
  return events.flatMap((event) => {
    if (!event.rrule) {
      const startAt = new Date(event.start_at);
      const endAt = new Date(event.end_at);
      if (startAt < range.end && endAt > range.start) {
        return [eventToCalendarInput(event)];
      }
      return [];
    }

    const startAt = new Date(event.start_at);
    const endAt = new Date(event.end_at);
    const durationMs = Math.max(30 * 60 * 1000, endAt.getTime() - startAt.getTime());
    return expandPreset(event, { start: startOfDay(range.start), end: endOfDay(range.end) }, durationMs, event.rrule);
  });
}
