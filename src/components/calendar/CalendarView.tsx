import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { EventInput, EventHoveringArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  EventClickArg,
  EventMountArg,
} from "@fullcalendar/core";
import { expandRecurringEvents } from "../../lib/rruleHelpers";
import type { Event } from "../../types";

const STORAGE_KEY = "dayforma-calendar-view";

const VALID_VIEWS = new Set([
  "dayGridMonth",
  "timeGridWeek",
  "timeGridDay",
  "listWeek",
]);

const DEFAULT_VIEW = "dayGridMonth";

function getSavedView(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_VIEWS.has(saved)) return saved;
  } catch {
    /* localStorage may be unavailable */
  }
  return DEFAULT_VIEW;
}

const DEFAULT_VISIBLE_RANGE = {
  start: new Date("2026-04-27T00:00:00"),
  end: new Date("2026-06-01T00:00:00"),
};

interface CalendarViewProps {
  events: Event[];
  extraEvents?: EventInput[];
  categoryColorMap?: Record<string, string>;
  onDateClick?: (date: Date, allDay: boolean) => void;
  onEventClick?: (eventId: string) => void;
}

export default function CalendarView({
  events,
  extraEvents,
  categoryColorMap,
  onDateClick,
  onEventClick,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [visibleRange, setVisibleRange] = useState(DEFAULT_VISIBLE_RANGE);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const concreteEvents = useMemo(() => {
    try {
      const expanded = expandRecurringEvents(events, visibleRange);
      return [...expanded, ...(extraEvents ?? [])].map((ev) => {
        const catId = ev.extendedProps?.categoryId as string | undefined;
        if (catId && categoryColorMap?.[catId]) {
          const color = categoryColorMap[catId];
          return {
            ...ev,
            backgroundColor: color,
            borderColor: color,
            textColor: "#ffffff",
          };
        }
        return ev;
      });
    } catch (err) {
      console.error("Failed to calculate concrete events:", err);
      return [];
    }
  }, [events, extraEvents, visibleRange, categoryColorMap]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    try {
      localStorage.setItem(STORAGE_KEY, arg.view.type);
    } catch {
      /* localStorage may be unavailable */
    }
    setVisibleRange({ start: arg.start, end: arg.end });
  }, []);

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const eventEnd = info.event.end ?? info.event.start;
    if (eventEnd && eventEnd < new Date()) {
      info.el.classList.add("fc-event-past");
    }
  }, []);

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      onDateClick?.(arg.date, arg.allDay);
    },
    [onDateClick]
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const sourceId =
        (arg.event.extendedProps as { sourceEventId?: string })?.sourceEventId ??
        arg.event.id;
      if (sourceId) onEventClick?.(sourceId);
    },
    [onEventClick]
  );

  const handleMouseEnter = useCallback((arg: EventHoveringArg) => {
    setTooltip({
      x: arg.jsEvent.clientX,
      y: arg.jsEvent.clientY,
      text: arg.event.title,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="fc-dayforma">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={getSavedView()}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        buttonText={{
          month: "Month",
          week: "Week",
          day: "Day",
          list: "Agenda",
        }}
        datesSet={handleDatesSet}
        eventDidMount={handleEventDidMount}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventMouseEnter={handleMouseEnter}
        eventMouseLeave={handleMouseLeave}
        events={concreteEvents}
        height={720}
        editable={false}
        selectable={true}
        dayMaxEvents={3}
        fixedWeekCount={false}
        nowIndicator={true}
        allDaySlot={true}
        scrollTime="08:00:00"
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
      />
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[99999] max-w-xs -translate-x-1/2 translate-y-3 rounded-md border border-slate-900/10 bg-slate-900/75 px-2.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/75 dark:text-slate-900"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>,
          document.body
        )}
    </div>
  );
}

