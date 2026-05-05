import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventMountArg } from "@fullcalendar/core";
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

const MOCK_EVENTS: Event[] = [
  {
    id: "mock-design-review",
    user_id: "mock-user",
    title: "Design review",
    description: null,
    start_at: "2026-04-29T14:00:00",
    end_at: "2026-04-29T15:00:00",
    all_day: false,
    category_id: null,
    rrule: null,
    reminder_offset_minutes: null,
    created_by_ai: false,
    created_at: "2026-04-28T10:00:00",
    updated_at: "2026-04-28T10:00:00",
  },
  {
    id: "mock-demo-dry-run",
    user_id: "mock-user",
    title: "Demo dry run",
    description: null,
    start_at: "2026-05-14T14:00:00",
    end_at: "2026-05-14T15:30:00",
    all_day: false,
    category_id: null,
    rrule: null,
    reminder_offset_minutes: null,
    created_by_ai: false,
    created_at: "2026-05-13T10:00:00",
    updated_at: "2026-05-13T10:00:00",
  },
];

interface CalendarViewProps {
  events?: Event[];
}

export default function CalendarView({ events = MOCK_EVENTS }: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [visibleRange, setVisibleRange] = useState(DEFAULT_VISIBLE_RANGE);

  const concreteEvents = useMemo(
    () => expandRecurringEvents(events, visibleRange),
    [events, visibleRange]
  );

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    try {
      localStorage.setItem(STORAGE_KEY, arg.view.type);
    } catch {
      /* localStorage may be unavailable */
    }

    setVisibleRange({
      start: arg.start,
      end: arg.end,
    });
  }, []);

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const eventEnd = info.event.end ?? info.event.start;
    if (eventEnd && eventEnd < new Date()) {
      info.el.classList.add("fc-event-past");
    }
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
        events={concreteEvents}
        height={720}
        editable={false}
        selectable={false}
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
