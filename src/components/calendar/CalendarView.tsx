import { useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  EventClickArg,
  EventInput,
  EventMountArg,
} from "@fullcalendar/core";

// ─── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "dayforma-calendar-view";

const VALID_VIEWS = new Set([
  "dayGridMonth",
  "timeGridWeek",
  "timeGridDay",
  "listWeek",
]);

const DEFAULT_VIEW = "dayGridMonth";

/** Read the persisted view from localStorage (falls back to Month). */
function getSavedView(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_VIEWS.has(saved)) return saved;
  } catch {
    /* localStorage may be unavailable */
  }
  return DEFAULT_VIEW;
}

interface CalendarViewProps {
  events: EventInput[];
  onDateClick?: (date: Date, allDay: boolean) => void;
  onEventClick?: (eventId: string) => void;
}

/**
 * FullCalendar multi-view wrapper with controlled view switching.
 *
 * Supports Month, Week, Day, and Agenda views. The last selected view
 * is persisted in localStorage so it survives page reloads.
 * Past events are visually dimmed via the .fc-event-past CSS class.
 */
export default function CalendarView({
  events,
  onDateClick,
  onEventClick,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const viewType = arg.view.type;
    try {
      localStorage.setItem(STORAGE_KEY, viewType);
    } catch {
      /* localStorage may be unavailable */
    }
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
      if (arg.event.id) onEventClick?.(arg.event.id);
    },
    [onEventClick]
  );

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
        events={events}
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
    </div>
  );
}
