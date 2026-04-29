import { useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventInput, EventMountArg } from "@fullcalendar/core";

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

// ─── Mock events for Sprint 1 ──────────────────────────────────────────────
// These will be replaced with live Supabase queries in a future sprint.
const MOCK_EVENTS: EventInput[] = [
  // ── Past events (early-to-mid April) ──────────────────────────────────────
  {
    id: "mock-p1",
    title: "Project kickoff meeting",
    start: "2026-04-01T10:00:00",
    end: "2026-04-01T11:30:00",
    backgroundColor: "#6366f1",
    textColor: "#ffffff",
  },
  {
    id: "mock-p2",
    title: "Requirements gathering",
    start: "2026-04-03T09:00:00",
    end: "2026-04-03T10:00:00",
    backgroundColor: "#0ea5e9",
    textColor: "#ffffff",
  },
  {
    id: "mock-p3",
    title: "Sprint planning",
    allDay: true,
    start: "2026-04-05",
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
  },
  {
    id: "mock-p4",
    title: "Database schema review",
    start: "2026-04-07T14:00:00",
    end: "2026-04-07T15:30:00",
    backgroundColor: "#f97316",
    textColor: "#ffffff",
  },
  {
    id: "mock-p5",
    title: "UI wireframe workshop",
    start: "2026-04-09T11:00:00",
    end: "2026-04-09T12:30:00",
    backgroundColor: "#ec4899",
    textColor: "#ffffff",
  },
  {
    id: "mock-p6",
    title: "API design discussion",
    start: "2026-04-11T15:00:00",
    end: "2026-04-11T16:00:00",
    backgroundColor: "#10b981",
    textColor: "#ffffff",
  },
  {
    id: "mock-p7",
    title: "Mid-sprint check-in",
    start: "2026-04-14T09:30:00",
    end: "2026-04-14T10:00:00",
    backgroundColor: "#0ea5e9",
    textColor: "#ffffff",
  },
  {
    id: "mock-p8",
    title: "Auth system review",
    start: "2026-04-16T13:00:00",
    end: "2026-04-16T14:00:00",
    backgroundColor: "#f43f5e",
    textColor: "#ffffff",
  },
  {
    id: "mock-p9",
    title: "Deployment setup",
    allDay: true,
    start: "2026-04-18",
    backgroundColor: "#06b6d4",
    textColor: "#ffffff",
  },
  {
    id: "mock-p10",
    title: "Team retrospective",
    start: "2026-04-21T16:00:00",
    end: "2026-04-21T17:00:00",
    backgroundColor: "#f59e0b",
    textColor: "#ffffff",
  },
  {
    id: "mock-p11",
    title: "Bug triage",
    start: "2026-04-23T10:00:00",
    end: "2026-04-23T11:00:00",
    backgroundColor: "#f43f5e",
    textColor: "#ffffff",
  },
  {
    id: "mock-p12",
    title: "Dashboard layout review",
    start: "2026-04-25T14:00:00",
    end: "2026-04-25T15:00:00",
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
  },

  // ── This week (late April) ────────────────────────────────────────────────
  {
    id: "mock-p13",
    title: "Focus block",
    start: "2026-04-27T10:00:00",
    end: "2026-04-27T12:00:00",
    backgroundColor: "#22c55e",
    textColor: "#ffffff",
  },
  {
    id: "mock-p14",
    title: "Mentor 1-on-1",
    start: "2026-04-27T14:00:00",
    end: "2026-04-27T14:45:00",
    backgroundColor: "#06b6d4",
    textColor: "#ffffff",
  },
  {
    id: "mock-p15",
    title: "Release prep",
    allDay: true,
    start: "2026-04-28",
    backgroundColor: "#f97316",
    textColor: "#ffffff",
  },
  {
    id: "mock-p16",
    title: "Supabase migration",
    start: "2026-04-28T10:00:00",
    end: "2026-04-28T12:00:00",
    backgroundColor: "#22c55e",
    textColor: "#ffffff",
  },

  // ── Today (April 29) ─────────────────────────────────────────────────────
  {
    id: "mock-t1",
    title: "Team standup",
    start: "2026-04-29T09:00:00",
    end: "2026-04-29T09:30:00",
    backgroundColor: "#0ea5e9",
    textColor: "#ffffff",
  },
  {
    id: "mock-t2",
    title: "Design review",
    start: "2026-04-29T14:00:00",
    end: "2026-04-29T15:00:00",
    backgroundColor: "#ec4899",
    textColor: "#ffffff",
  },
  {
    id: "mock-t3",
    title: "Evening study",
    start: "2026-04-29T19:00:00",
    end: "2026-04-29T20:30:00",
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
  },

  // ── Tomorrow and rest of week ─────────────────────────────────────────────
  {
    id: "mock-f1",
    title: "AI scheduling sync",
    start: "2026-04-30T11:00:00",
    end: "2026-04-30T12:00:00",
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
  },
  {
    id: "mock-f2",
    title: "Code review session",
    start: "2026-04-30T15:30:00",
    end: "2026-04-30T16:30:00",
    backgroundColor: "#f59e0b",
    textColor: "#ffffff",
  },

  // ── May events ────────────────────────────────────────────────────────────
  {
    id: "mock-m1",
    title: "Sprint kickoff",
    start: "2026-05-01T09:00:00",
    end: "2026-05-01T10:00:00",
    backgroundColor: "#0ea5e9",
    textColor: "#ffffff",
  },
  {
    id: "mock-m2",
    title: "Voice prototype",
    start: "2026-05-03T13:30:00",
    end: "2026-05-03T15:00:00",
    backgroundColor: "#f59e0b",
    textColor: "#ffffff",
  },
  {
    id: "mock-m3",
    title: "Office hours",
    start: "2026-05-06T10:00:00",
    end: "2026-05-06T11:00:00",
    backgroundColor: "#10b981",
    textColor: "#ffffff",
  },
  {
    id: "mock-m4",
    title: "UX review",
    start: "2026-05-09T11:00:00",
    end: "2026-05-09T12:00:00",
    backgroundColor: "#f43f5e",
    textColor: "#ffffff",
  },
  {
    id: "mock-m5",
    title: "AI parser QA",
    start: "2026-05-11T15:00:00",
    end: "2026-05-11T16:30:00",
    backgroundColor: "#8b5cf6",
    textColor: "#ffffff",
  },
  {
    id: "mock-m6",
    title: "Demo dry run",
    start: "2026-05-14T14:00:00",
    end: "2026-05-14T15:30:00",
    backgroundColor: "#06b6d4",
    textColor: "#ffffff",
  },
  {
    id: "mock-m7",
    title: "Database check-in",
    start: "2026-05-17T16:00:00",
    end: "2026-05-17T17:00:00",
    backgroundColor: "#f97316",
    textColor: "#ffffff",
  },
  {
    id: "mock-m8",
    title: "Study block",
    start: "2026-05-20T18:30:00",
    end: "2026-05-20T19:30:00",
    backgroundColor: "#22c55e",
    textColor: "#ffffff",
  },
  {
    id: "mock-m9",
    title: "Presentation polish",
    start: "2026-05-23T12:00:00",
    end: "2026-05-23T13:00:00",
    backgroundColor: "#ec4899",
    textColor: "#ffffff",
  },
  {
    id: "mock-m10",
    title: "Launch checklist",
    start: "2026-05-29T17:00:00",
    end: "2026-05-29T18:00:00",
    backgroundColor: "#6366f1",
    textColor: "#ffffff",
  },
];

interface CalendarViewProps {
  /** Override the default mock events (for future live data). */
  events?: EventInput[];
}

/**
 * FullCalendar multi-view wrapper with controlled view switching.
 *
 * Supports Month, Week, Day, and Agenda views. The last selected view
 * is persisted in localStorage so it survives page reloads.
 * Past events are visually dimmed via the .fc-event-past CSS class.
 */
export default function CalendarView({ events = MOCK_EVENTS }: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  /** Persist the current view whenever the user switches. */
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const viewType = arg.view.type;
    try {
      localStorage.setItem(STORAGE_KEY, viewType);
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);

  /** Mark past events with a CSS class so they render dimmed. */
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
        events={events}
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
