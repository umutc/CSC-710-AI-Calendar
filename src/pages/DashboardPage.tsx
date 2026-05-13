import { useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { format, isThisWeek, isToday, isTomorrow, parseISO } from "date-fns";
import { toast } from "sonner";
import { Calendar, Check, LogOut, Pencil, Settings, Sparkles, Trash2, X } from "lucide-react";
import AIAssistant from "../components/ai/AIAssistant";
import { useAuth } from "../hooks/useAuth";
import { useCategories } from "../hooks/useCategories";
import { useEvents } from "../hooks/useEvents";
import { useTodos } from "../hooks/useTodos";
import { useHolidays } from "../hooks/useHolidays";
import CalendarView from "../components/calendar/CalendarView";
import EventModal from "../components/calendar/EventModal";
import HolidayModal from "../components/calendar/HolidayModal";
import ThemeToggle from "../components/common/ThemeToggle";
import type { EventInput } from "@fullcalendar/core";
import type { EventFormValues } from "../lib/schemas/event";
import type { Event, Priority, RRulePreset, Todo } from "../types";

type EditModalState =
  | { mode: "closed" }
  | { mode: "edit"; eventId: string; initialValues: Partial<EventFormValues> };

function eventToFormValues(ev: Event): Partial<EventFormValues> {
  const start = parseISO(ev.start_at);
  const end = parseISO(ev.end_at);
  if (ev.all_day) {
    try {
      return {
        title: ev.title,
        description: ev.description,
        all_day: true,
        start_local: format(start, "yyyy-MM-dd"),
        end_local: format(end, "yyyy-MM-dd"),
        category_id: ev.category_id,
        reminder_offset_minutes: ev.reminder_offset_minutes,
        rrule: ev.rrule,
      };
    } catch (err) {
      console.error("eventToFormValues all_day failed:", err, ev);
    }
  }
  try {
    return {
      title: ev.title,
      description: ev.description,
      all_day: false,
      start_local: format(start, "yyyy-MM-dd'T'HH:mm"),
      end_local: format(end, "yyyy-MM-dd'T'HH:mm"),
      category_id: ev.category_id,
      reminder_offset_minutes: ev.reminder_offset_minutes,
      rrule: ev.rrule,
    };
  } catch (err) {
    console.error("eventToFormValues failed:", err, ev);
    return {
      title: ev.title,
      all_day: ev.all_day,
      start_local: "",
      end_local: "",
      rrule: ev.rrule,
    };
  }
}

type AgendaEvent = {
  title: string;
  time: string;
  category: string;
  tone: string;
};

type SortMode = "priority" | "due";

type TodoDraft = {
  title: string;
  due_at: string;
  priority: Priority;
  eventStartTime: string;
  eventEndTime: string;
  eventRecurrence: EventFormState["recurrence"];
  eventWeekdays: number[];
};

type EventFormState = {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  recurrence: "none" | "daily" | "weekday" | "weekly" | "biweekly" | "monthly";
  weekdays: number[];
  categoryId: string | null;
};

const agenda: AgendaEvent[] = [
  { title: "Daily standup", time: "09:00", category: "Team", tone: "sky" },
  { title: "Calendar drop UX pass", time: "11:00", category: "Design", tone: "rose" },
  { title: "AI scheduling sync", time: "14:00", category: "Build", tone: "amber" },
  { title: "Evening study block", time: "19:00", category: "Focus", tone: "emerald" },
];

const priorityOrder: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const weekdayOptions = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

function priorityClasses(priority: Priority) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    case "high":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200";
    case "low":
    default:
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200";
  }
}

function priorityLabel(priority: Priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDue(due: string | null): string {
  if (!due) return "No due date";
  const date = parseISO(due);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isThisWeek(date)) return format(date, "eee");
  return format(date, "MMM d");
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function toneClasses(tone: string) {
  switch (tone) {
    case "sky":
      return "bg-sky-100 text-sky-700 ring-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/30";
    case "amber":
      return "bg-amber-100 text-amber-800 ring-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/30";
    case "emerald":
      return "bg-emerald-100 text-emerald-700 ring-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30";
    case "rose":
      return "bg-rose-100 text-rose-700 ring-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/30";
    case "violet":
      return "bg-violet-100 text-violet-700 ring-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30";
    default:
      return "bg-slate-900/10 text-slate-700 ring-slate-900/15 dark:bg-white/10 dark:text-white dark:ring-white/15";
  }
}

function toDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function getDefaultEventFormState(): EventFormState {
  const now = new Date();
  const startHour = `${String(Math.max(now.getHours() + 1, 9)).padStart(2, "0")}:00`;
  const endHour = `${String(Math.max(now.getHours() + 2, 10)).padStart(2, "0")}:00`;
  const isoDate = now.toISOString().slice(0, 10);

  return {
    title: "",
    startDate: isoDate,
    startTime: startHour,
    endDate: isoDate,
    endTime: endHour,
    allDay: false,
    recurrence: "none",
    weekdays: [new Date(`${isoDate}T00:00:00`).getDay()],
    categoryId: null,
  };
}

function rruleToFormState(rrule: RRulePreset): {
  recurrence: EventFormState["recurrence"];
  weekdays: number[];
} {
  switch (rrule.preset) {
    case "daily": return { recurrence: "daily", weekdays: [] };
    case "weekday": return { recurrence: "weekday", weekdays: [] };
    case "weekly": return { recurrence: "weekly", weekdays: rrule.weekdays };
    case "biweekly": return { recurrence: "biweekly", weekdays: rrule.weekdays };
    case "monthly": return { recurrence: "monthly", weekdays: [] };
  }
}

function buildRRule(form: EventFormState): RRulePreset | null {
  switch (form.recurrence) {
    case "daily":
      return { preset: "daily" };
    case "weekday":
      return { preset: "weekday" };
    case "weekly":
      return {
        preset: "weekly",
        weekdays: form.weekdays.length > 0 ? form.weekdays : [new Date(`${form.startDate}T00:00:00`).getDay()],
      };
    case "biweekly":
      return {
        preset: "biweekly",
        weekdays: form.weekdays.length > 0 ? form.weekdays : [new Date(`${form.startDate}T00:00:00`).getDay()],
      };
    case "monthly":
      return {
        preset: "monthly",
        day_of_month: new Date(`${form.startDate}T00:00:00`).getDate(),
      };
    case "none":
    default:
      return null;
  }
}

function DashboardHeader({
  displayName,
  onLogout,
  onOpenSettings,
  onOpenTodos,
}: {
  displayName: string;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenTodos: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-900/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700/90 dark:text-cyan-300/80">
              Dayforma Dashboard
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Your day, mapped and movable
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Welcome back, {displayName}. Calendar on the left, action queue on the right.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-slate-900/10 bg-slate-900/[0.04] px-3 py-1 text-xs text-slate-500 sm:inline-flex dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-400">
            Dashboard
          </span>
          {/* Removed standalone Week view button */}
          <button
            className="inline-flex rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 lg:hidden dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
            onClick={onOpenTodos}
            type="button"
          >
            Open todos
          </button>
          <button
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-cyan-700 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-cyan-300"
            onClick={onOpenSettings}
            title="Settings"
            type="button"
          >
            <Settings className="h-5 w-5" />
          </button>
          <ThemeToggle />
          <button
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-red-400"
            onClick={onLogout}
            title="Sign out"
            type="button"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function EventComposer({
  open,
  form,
  loading,
  onClose,
  onChange,
  onToggleWeekday,
  onSubmit,
  categories,
}: {
  open: boolean;
  form: EventFormState;
  loading: boolean;
  onClose: () => void;
  onChange: (patch: Partial<EventFormState>) => void;
  onToggleWeekday: (weekday: number) => void;
  onSubmit: () => void;
  categories: { id: string; name: string }[];
}) {
  if (!open) return null;

  const inputClasses =
    "w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20";
  const labelClasses = "grid gap-2 text-sm text-slate-700 dark:text-slate-300";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/75" onClick={onClose} />
      <div className="fixed inset-x-0 top-10 z-50 mx-auto w-[min(92vw,40rem)]">
        <div className="panel-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Add Event</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Create recurring event</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Examples: work Mon-Fri from 9AM-5PM, dance practice every Wednesday 6PM-7PM.
              </p>
            </div>
            <button
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <input
              className={inputClasses}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Event title"
              value={form.title}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClasses}>
                <span>Start date</span>
                <input
                  className={inputClasses}
                  onChange={(event) => onChange({ startDate: event.target.value })}
                  type="date"
                  value={form.startDate}
                />
              </label>
              <label className={labelClasses}>
                <span>End date</span>
                <input
                  className={inputClasses}
                  onChange={(event) => onChange({ endDate: event.target.value })}
                  type="date"
                  value={form.endDate}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClasses}>
                <span>Start time</span>
                <input
                  className={inputClasses}
                  disabled={form.allDay}
                  onChange={(event) => onChange({ startTime: event.target.value })}
                  type="time"
                  value={form.startTime}
                />
              </label>
              <label className={labelClasses}>
                <span>End time</span>
                <input
                  className={inputClasses}
                  disabled={form.allDay}
                  onChange={(event) => onChange({ endTime: event.target.value })}
                  type="time"
                  value={form.endTime}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
                <input
                  checked={form.allDay}
                  className="h-4 w-4 accent-cyan-500 dark:accent-cyan-300"
                  onChange={(event) => onChange({ allDay: event.target.checked })}
                  type="checkbox"
                />
                All-day event
              </label>

              <label className={labelClasses}>
                <span>Category</span>
                <select
                  className={inputClasses}
                  onChange={(event) =>
                    onChange({ categoryId: event.target.value === "" ? null : event.target.value })
                  }
                  value={form.categoryId ?? ""}
                >
                  <option value="">(none)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={labelClasses}>
              <span>Repeat</span>
              <select
                className={inputClasses}
                onChange={(event) =>
                  onChange({ recurrence: event.target.value as EventFormState["recurrence"] })
                }
                value={form.recurrence}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekday">Every weekday (Mon-Fri)</option>
                <option value="weekly">Weekly on selected days</option>
                <option value="biweekly">Every other week (biweekly)</option>
                <option value="monthly">Monthly on start date day</option>
              </select>
            </label>

            {(form.recurrence === "weekly" || form.recurrence === "biweekly") && (
              <div className="grid gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">Weekdays</p>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((day) => {
                    const active = form.weekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        className={`rounded-full px-3 py-2 text-sm font-medium transition ${active
                            ? "bg-cyan-500 text-white dark:bg-cyan-300 dark:text-slate-950"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                          }`}
                        onClick={() => onToggleWeekday(day.value)}
                        type="button"
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              {form.recurrence === "weekday" && "This event will repeat Monday through Friday."}
              {form.recurrence === "biweekly" && "This event will repeat every other week on the selected days."}
              {form.recurrence === "monthly" &&
                `This event will repeat on day ${new Date(`${form.startDate}T00:00:00`).getDate()} of each month.`}
              {form.recurrence === "weekly" &&
                "This event will repeat on the selected weekdays using the same time window."}
              {form.recurrence === "daily" && "This event will repeat every day using the same time window."}
              {form.recurrence === "none" && "This will create a one-time event."}
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                disabled={loading}
                onClick={onSubmit}
                type="button"
              >
                {loading ? "Creating..." : "Create event"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface CalendarPanelProps {
  events: Event[];
  extraEvents?: EventInput[];
  categoryColorMap?: Record<string, string>;
  onDateClick: (date: Date, allDay: boolean) => void;
  onEventClick: (id: string) => void;
  onAddEvent: () => void;
}

function CalendarPanel({ events, extraEvents, categoryColorMap, onDateClick, onEventClick, onAddEvent }: CalendarPanelProps) {
  return (
    <section className="space-y-6">
      <div className="panel-surface overflow-hidden p-4 sm:p-6">
        <CalendarView
          events={events}
          extraEvents={extraEvents}
          categoryColorMap={categoryColorMap}
          onDateClick={onDateClick}
          onEventClick={onEventClick}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="panel-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Today</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Agenda snapshots</h3>
            </div>
            <button
              className="rounded-full border border-slate-900/10 bg-slate-900/[0.04] px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-900/[0.08] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              onClick={onAddEvent}
              type="button"
            >
              Add event
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {agenda.map((item) => (
              <div
                key={`${item.time}-${item.title}`}
                className="flex items-center gap-4 rounded-3xl border border-slate-900/[0.08] bg-slate-900/[0.03] px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
              >
                <div className="w-16 shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{item.time}</div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.category}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ring-1 ${toneClasses(item.tone)}`}>
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-surface p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Insights</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">AI scheduling lane</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-cyan-600/30 bg-cyan-500/10 p-4 text-slate-800 dark:border-cyan-400/20 dark:bg-cyan-300/10 dark:text-slate-100">
              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-100">Best focus block</p>
              <p className="mt-2 text-2xl font-semibold">3:30 PM - 5:00 PM</p>
              <p className="mt-2 text-sm text-cyan-700/80 dark:text-cyan-50/80">
                Wide open after your team sync, before evening errands start.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-900/[0.08] bg-slate-900/[0.03] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Collision watch</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Two unscheduled todos still need time on Friday. The drawer layout leaves room for a
                future smart recommendations feed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function TodoRow({
  todo,
  isEditing,
  draft,
  onEditStart,
  onDraftChange,
  onSave,
  onCancel,
  onDelete,
  onToggle,
  onEditKeyDown,
}: {
  todo: Todo;
  isEditing: boolean;
  draft: TodoDraft | null;
  onEditStart: (todo: Todo) => void;
  onDraftChange: (patch: Partial<TodoDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) {
  const done = todo.status === "done";

  return (
    <article
      className={`rounded-3xl border px-4 py-4 ${done
          ? "border-slate-900/[0.08] bg-slate-900/[0.03] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400"
          : "border-slate-900/10 bg-white/95 text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
        }`}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={done ? "Mark as pending" : "Mark as done"}
          className={`mt-1 h-5 w-5 shrink-0 rounded-full border transition ${done
              ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-300 dark:bg-emerald-300 dark:text-slate-950"
              : todo.status === "scheduled"
                ? "border-violet-500/60 bg-violet-100 text-violet-700 hover:border-emerald-500 dark:border-violet-300/60 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:border-emerald-300"
                : "border-slate-400 text-transparent hover:border-emerald-500 dark:border-slate-500 dark:hover:border-emerald-300"
            }`}
          onClick={() => onToggle(todo.id)}
          type="button"
        >
          {done ? <Check className="h-3.5 w-3.5" /> : null}
        </button>

        <div className="flex-1">
          {isEditing && draft ? (
            <div className="space-y-3">
              <input
                autoFocus
                className="w-full rounded-2xl border border-cyan-600/40 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-cyan-700 dark:border-cyan-400/30 dark:bg-slate-950/70 dark:text-white dark:focus:border-cyan-300"
                onChange={(event) => onDraftChange({ title: event.target.value })}
                onKeyDown={onEditKeyDown}
                placeholder="Todo title"
                value={draft.title}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                  onChange={(event) => onDraftChange({ due_at: event.target.value })}
                  onKeyDown={onEditKeyDown}
                  type="date"
                  value={draft.due_at}
                />
                <select
                  className="rounded-2xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                  onChange={(event) => onDraftChange({ priority: event.target.value as Priority })}
                  onKeyDown={onEditKeyDown}
                  value={draft.priority}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              {todo.status === "scheduled" && todo.linked_event_id && draft && (
                <div className="space-y-3 rounded-2xl border border-violet-600/20 bg-violet-50/60 p-3 dark:border-violet-400/15 dark:bg-violet-500/10">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Recurring event schedule</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Start time</span>
                      <input
                        className="rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                        onChange={(e) => onDraftChange({ eventStartTime: e.target.value })}
                        onKeyDown={onEditKeyDown}
                        type="time"
                        value={draft.eventStartTime}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">End time</span>
                      <input
                        className="rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                        onChange={(e) => onDraftChange({ eventEndTime: e.target.value })}
                        onKeyDown={onEditKeyDown}
                        type="time"
                        value={draft.eventEndTime}
                      />
                    </label>
                  </div>
                  <select
                    className="w-full rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                    onChange={(e) => onDraftChange({ eventRecurrence: e.target.value as EventFormState["recurrence"] })}
                    onKeyDown={onEditKeyDown}
                    value={draft.eventRecurrence}
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Every day</option>
                    <option value="weekday">Every weekday (Mon–Fri)</option>
                    <option value="weekly">Weekly on selected days</option>
                    <option value="biweekly">Every other week (biweekly)</option>
                    <option value="monthly">Monthly on due date day</option>
                  </select>
                  {(draft.eventRecurrence === "weekly" || draft.eventRecurrence === "biweekly") && (
                    <div className="flex flex-wrap gap-1.5">
                      {weekdayOptions.map((day) => {
                        const active = draft.eventWeekdays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${active
                                ? "bg-cyan-600 text-white dark:bg-cyan-300 dark:text-slate-950"
                                : "border border-slate-900/10 bg-white text-slate-600 hover:bg-slate-900/[0.06] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10"
                              }`}
                            onClick={() =>
                              onDraftChange({
                                eventWeekdays: active
                                  ? draft.eventWeekdays.filter((v) => v !== day.value)
                                  : [...draft.eventWeekdays, day.value].sort((a, b) => a - b),
                              })
                            }
                            type="button"
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                  onClick={onSave}
                  type="button"
                >
                  Save
                </button>
                <button
                  className="rounded-full border border-slate-900/10 bg-slate-900/[0.04] px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-900/[0.08] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <button
                  className={`text-left font-medium transition hover:text-cyan-700 dark:hover:text-cyan-200 ${done ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"
                    }`}
                  onClick={() => onEditStart(todo)}
                  type="button"
                >
                  {todo.title}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-cyan-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-cyan-200"
                    onClick={() => onEditStart(todo)}
                    title="Edit todo"
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-red-300"
                    onClick={() => onDelete(todo.id)}
                    title="Delete todo"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-900/[0.06] px-3 py-1 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300">
                  {formatDue(todo.due_at)}
                </span>
                <span className={`rounded-full px-3 py-1 ${priorityClasses(todo.priority)}`}>
                  {priorityLabel(todo.priority)}
                </span>
                {todo.status === "scheduled" && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    Scheduled
                  </span>
                )}
                {todo.created_by_ai && (
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                    AI
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function TodoPanel({ mobile = false }: { mobile?: boolean }) {
  const { todos, loading, error, createTodo, deleteTodo, toggleStatus, updateTodo } = useTodos();
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newDueAt, setNewDueAt] = useState("");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newEventStartTime, setNewEventStartTime] = useState("09:00");
  const [newEventEndTime, setNewEventEndTime] = useState("10:00");
  const [newEventRecurrence, setNewEventRecurrence] = useState<EventFormState["recurrence"]>("weekly");
  const [newEventWeekdays, setNewEventWeekdays] = useState<number[]>([]);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TodoDraft | null>(null);

  const activeCount = todos.filter((t) => t.status !== "done").length;

  const sortedTodos = useMemo(() => {
    const next = [...todos];
    next.sort((a, b) => {
      if (sortMode === "priority") {
        const priorityDelta = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDelta !== 0) return priorityDelta;
      } else {
        if (a.due_at && b.due_at) {
          const dueDelta = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
          if (dueDelta !== 0) return dueDelta;
        } else if (a.due_at && !b.due_at) {
          return -1;
        } else if (!a.due_at && b.due_at) {
          return 1;
        }
      }

      if (a.status !== b.status) {
        if (a.status === "done") return 1;
        if (b.status === "done") return -1;
      }

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return next;
  }, [sortMode, todos]);

  async function handleCreateTodo() {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    let linkedEventId: string | null = null;

    if (newRecurring) {
      const baseDate = newDueAt || new Date().toISOString().slice(0, 10);
      linkedEventId = await createEvent({
        title: trimmedTitle,
        start_at: `${baseDate}T${newEventStartTime}:00`,
        end_at: `${baseDate}T${newEventEndTime}:00`,
        all_day: false,
        rrule: buildRRule({
          title: trimmedTitle,
          startDate: baseDate,
          startTime: newEventStartTime,
          endDate: baseDate,
          endTime: newEventEndTime,
          allDay: false,
          recurrence: newEventRecurrence,
          weekdays:
            newEventWeekdays.length > 0
              ? newEventWeekdays
              : [new Date(`${baseDate}T00:00:00`).getDay()],
          categoryId: null,
        }),
      });
    }

    await createTodo({
      title: trimmedTitle,
      priority: newPriority,
      due_at: newDueAt || null,
      linked_event_id: linkedEventId,
      status: linkedEventId ? "scheduled" : undefined,
    });

    setNewTitle("");
    setNewPriority("medium");
    setNewDueAt("");
    setNewRecurring(false);
    setNewEventStartTime("09:00");
    setNewEventEndTime("10:00");
    setNewEventRecurrence("weekly");
    setNewEventWeekdays([]);
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleCreateTodo();
  }

  function handleEditStart(todo: Todo) {
    setEditingTodoId(todo.id);

    if (todo.status === "scheduled" && todo.linked_event_id) {
      const event = events.find((e) => e.id === todo.linked_event_id);
      const { recurrence, weekdays } = event?.rrule
        ? rruleToFormState(event.rrule)
        : { recurrence: "none" as const, weekdays: [] };
      setDraft({
        title: todo.title,
        due_at: toDateInputValue(todo.due_at) || (event?.start_at.slice(0, 10) ?? ""),
        priority: todo.priority,
        eventStartTime: event ? event.start_at.slice(11, 16) : "09:00",
        eventEndTime: event ? event.end_at.slice(11, 16) : "10:00",
        eventRecurrence: recurrence,
        eventWeekdays: weekdays,
      });
    } else {
      setDraft({
        title: todo.title,
        due_at: toDateInputValue(todo.due_at),
        priority: todo.priority,
        eventStartTime: "09:00",
        eventEndTime: "10:00",
        eventRecurrence: "none",
        eventWeekdays: [],
      });
    }
  }

  function handleEditCancel() {
    setEditingTodoId(null);
    setDraft(null);
  }

  async function handleEditSave() {
    if (!editingTodoId || !draft) return;

    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) return;

    const todo = todos.find((t) => t.id === editingTodoId);

    if (todo?.linked_event_id) {
      const baseDate = draft.due_at || new Date().toISOString().slice(0, 10);
      await updateEvent(todo.linked_event_id, {
        title: trimmedTitle,
        start_at: `${baseDate}T${draft.eventStartTime}:00`,
        end_at: `${baseDate}T${draft.eventEndTime}:00`,
        rrule: buildRRule({
          title: trimmedTitle,
          startDate: baseDate,
          startTime: draft.eventStartTime,
          endDate: baseDate,
          endTime: draft.eventEndTime,
          allDay: false,
          recurrence: draft.eventRecurrence,
          weekdays:
            draft.eventWeekdays.length > 0
              ? draft.eventWeekdays
              : [new Date(`${baseDate}T00:00:00`).getDay()],
          categoryId: null,
        }),
      });
    }

    await updateTodo(editingTodoId, {
      title: trimmedTitle,
      due_at: draft.due_at || null,
      priority: draft.priority,
    });

    handleEditCancel();
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleEditCancel();
      return;
    }

    if (event.key === "Enter" && event.currentTarget.tagName !== "SELECT") {
      event.preventDefault();
      void handleEditSave();
    }
  }

  async function handleDelete(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (todo?.linked_event_id) {
      await deleteEvent(todo.linked_event_id);
    }
    await deleteTodo(id);
    if (editingTodoId === id) {
      handleEditCancel();
    }
  }

  return (
    <section className="flex h-full flex-col">
      <div className={`panel-surface flex h-full flex-col ${mobile ? "rounded-t-[2rem] p-5" : "p-5"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Tasks</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Todo panel</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Create, reorder, update, and clear tasks without leaving the dashboard.
            </p>
          </div>
          <span className="rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
            {activeCount} active
          </span>
        </div>

        <form
          className="mt-5 rounded-3xl border border-slate-900/[0.08] bg-slate-900/[0.03] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
          onSubmit={handleCreateSubmit}
        >
          <div className="grid gap-3">
            <input
              className="w-full rounded-2xl border border-slate-900/10 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-900/20 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/20 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20"
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Add a todo title"
              value={newTitle}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className="w-full cursor-pointer rounded-2xl border border-slate-900/10 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition hover:border-slate-900/20 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-white/20 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20"
                onChange={(event) => setNewPriority(event.target.value as Priority)}
                value={newPriority}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                className="w-full cursor-pointer rounded-2xl border border-slate-900/10 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition hover:border-slate-900/20 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-white/20 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20"
                onChange={(event) => setNewDueAt(event.target.value)}
                type="date"
                value={newDueAt}
              />
              <button
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus:ring-cyan-300/30"
                type="submit"
              >
                Add todo
              </button>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
              <input
                checked={newRecurring}
                className="h-4 w-4 accent-cyan-600 dark:accent-cyan-300"
                onChange={(event) => setNewRecurring(event.target.checked)}
                type="checkbox"
              />
              Schedule as recurring calendar event
            </label>

            {newRecurring && (
              <div className="space-y-3 rounded-2xl border border-slate-900/10 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-950/50">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Start time</span>
                    <input
                      className="rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                      onChange={(event) => setNewEventStartTime(event.target.value)}
                      type="time"
                      value={newEventStartTime}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">End time</span>
                    <input
                      className="rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                      onChange={(event) => setNewEventEndTime(event.target.value)}
                      type="time"
                      value={newEventEndTime}
                    />
                  </label>
                </div>
                <select
                  className="w-full rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:focus:border-cyan-300"
                  onChange={(event) =>
                    setNewEventRecurrence(event.target.value as EventFormState["recurrence"])
                  }
                  value={newEventRecurrence}
                >
                  <option value="daily">Every day</option>
                  <option value="weekday">Every weekday (Mon–Fri)</option>
                  <option value="weekly">Weekly on selected days</option>
                  <option value="biweekly">Every other week (biweekly)</option>
                  <option value="monthly">Monthly on due date day</option>
                </select>
                {(newEventRecurrence === "weekly" || newEventRecurrence === "biweekly") && (
                  <div className="flex flex-wrap gap-1.5">
                    {weekdayOptions.map((day) => {
                      const active = newEventWeekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${active
                              ? "bg-cyan-600 text-white dark:bg-cyan-300 dark:text-slate-950"
                              : "border border-slate-900/10 bg-white text-slate-600 hover:bg-slate-900/[0.06] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-white/10"
                            }`}
                          onClick={() =>
                            setNewEventWeekdays((prev) =>
                              active
                                ? prev.filter((v) => v !== day.value)
                                : [...prev, day.value].sort((a, b) => a - b)
                            )
                          }
                          type="button"
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!newDueAt && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Tip: set a due date above to anchor the event's start date.
                  </p>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sort by</p>
          </div>
          <div className="flex gap-2">
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sortMode === "priority"
                  ? "bg-cyan-600 text-white dark:bg-cyan-300 dark:text-slate-950"
                  : "border border-slate-900/10 bg-slate-900/[0.04] text-slate-700 hover:bg-slate-900/[0.08] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              onClick={() => setSortMode("priority")}
              type="button"
            >
              Priority
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sortMode === "due"
                  ? "bg-cyan-600 text-white dark:bg-cyan-300 dark:text-slate-950"
                  : "border border-slate-900/10 bg-slate-900/[0.04] text-slate-700 hover:bg-slate-900/[0.08] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              onClick={() => setSortMode("due")}
              type="button"
            >
              Due date
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading && (
            <p className="rounded-3xl border border-slate-900/[0.08] bg-slate-900/[0.03] px-4 py-6 text-center text-sm text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400">
              Loading todos…
            </p>
          )}
          {!loading && error && (
            <p className="rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}
          {!loading && !error && sortedTodos.length === 0 && (
            <p className="rounded-3xl border border-dashed border-slate-900/15 bg-slate-900/[0.03] px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400">
              No todos yet. Use the form above to add your first task.
            </p>
          )}
          {!loading &&
            !error &&
            sortedTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                draft={editingTodoId === todo.id ? draft : null}
                isEditing={editingTodoId === todo.id}
                onCancel={handleEditCancel}
                onDelete={handleDelete}
                onDraftChange={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
                onEditKeyDown={handleEditKeyDown}
                onEditStart={handleEditStart}
                onSave={handleEditSave}
                onToggle={toggleStatus}
                todo={todo}
              />
            ))}
        </div>

        <div className="mt-5 rounded-3xl border border-dashed border-slate-900/15 bg-slate-900/[0.03] p-4 dark:border-white/15 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Inline workflow</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Click the status dot for one-tap completion, click a title or pencil to edit inline,
            and use the sort pills to reprioritize the queue instantly.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const { events, createEvent } = useEvents();
  const { categories } = useCategories();
  const { todos } = useTodos();
  const holidays = useHolidays();
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [eventComposerOpen, setEventComposerOpen] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(getDefaultEventFormState());
  const [editModalState, setEditModalState] = useState<EditModalState>({ mode: "closed" });
  const [holidayModalData, setHolidayModalData] = useState<{ title: string, date: string, type: string, description: string } | null>(null);

  const visibleEvents = useMemo(() => events, [events]);

  // Build a lookup map from category id → hex color for calendar rendering
  const categoryColorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        if (cat && cat.id) {
          map[cat.id] = cat.color;
        }
      }
    }
    return map;
  }, [categories]);

  // Build calendar entries from todos that have a due date, colored by priority.
  // Skip todos already linked to a real calendar event (to avoid duplicates).
  const todoCalendarEvents = useMemo<EventInput[]>(() => {
    return todos
      .filter((t) => t.due_at && !t.linked_event_id)
      .map((t) => {
        const dateStr = t.due_at!.slice(0, 10);
        const prefix = t.status === "done" ? "☑" : "☐";
        return {
          id: `todo::${t.id}`,
          title: `${prefix} ${t.title}`,
          start: `${dateStr}T00:00:00`,
          end: `${dateStr}T23:59:59`,
          allDay: true,
          classNames: [`fc-todo-${t.priority}`],
          extendedProps: {
            sourceEventId: `todo::${t.id}`,
            priority: t.priority,
          },
        };
      });
  }, [todos]);

  function openComposerForDate(date: Date, allDay: boolean) {
    const ymd = format(date, "yyyy-MM-dd");
    const startTime = allDay ? "09:00" : format(date, "HH:mm");
    const endDate = new Date(date.getTime() + 60 * 60 * 1000);
    const endTime = allDay ? "10:00" : format(endDate, "HH:mm");
    setEventForm({
      title: "",
      startDate: ymd,
      startTime,
      endDate: ymd,
      endTime,
      allDay,
      recurrence: "none",
      weekdays: [date.getDay()],
      categoryId: null,
    });
    setEventComposerOpen(true);
  }

  function handleAddEvent() {
    setEventForm(getDefaultEventFormState());
    setEventComposerOpen(true);
  }

  function handleEventClick(id: string) {
    if (id.startsWith("todo::")) {
      return;
    }

    if (id.startsWith("holiday-")) {
      const holidayEvent = holidays.find(h => h.id === id);
      if (holidayEvent) {
        setHolidayModalData({
          title: holidayEvent.title || "",
          date: holidayEvent.start as string,
          type: holidayEvent.extendedProps?.type || "public",
          description: holidayEvent.extendedProps?.description || ""
        });
      }
      return;
    }

    try {
      const ev = events.find((e) => e.id === id);
      if (!ev) {
        console.warn("Event not found for id:", id);
        return;
      }
      const formValues = eventToFormValues(ev);
      setEditModalState({
        mode: "edit",
        eventId: id,
        initialValues: formValues,
      });
    } catch (err) {
      console.error("Failed to open edit modal:", err);
      toast.error("Could not open event details.");
    }
  }

  function closeEditModal() {
    setEditModalState({ mode: "closed" });
  }

  async function handleLogout() {
    await signOut();
    navigate("/", { replace: true });
  }

  function resetEventComposer() {
    setEventForm(getDefaultEventFormState());
    setEventComposerOpen(false);
    setEventSubmitting(false);
  }

  function handleToggleWeekday(weekday: number) {
    setEventForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(weekday)
        ? current.weekdays.filter((value) => value !== weekday)
        : [...current.weekdays, weekday].sort((a, b) => a - b),
    }));
  }

  async function handleCreateEvent() {
    if (!eventForm.title.trim()) return;

    setEventSubmitting(true);

    const startAt = eventForm.allDay
      ? `${eventForm.startDate}T00:00:00`
      : toDateTime(eventForm.startDate, eventForm.startTime);
    const endAt = eventForm.allDay
      ? `${eventForm.endDate}T23:59:00`
      : toDateTime(eventForm.endDate, eventForm.endTime);

    await createEvent({
      title: eventForm.title.trim(),
      start_at: startAt,
      end_at: endAt,
      all_day: eventForm.allDay,
      category_id: eventForm.categoryId,
      rrule: buildRRule(eventForm),
    });

    resetEventComposer();
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <DashboardHeader
        displayName={profile?.display_name ?? user?.email ?? "there"}
        onLogout={handleLogout}
        onOpenSettings={() => navigate("/settings")}
        onOpenTodos={() => setMobileDrawerOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
          <CalendarPanel
            events={visibleEvents}
            extraEvents={[...todoCalendarEvents, ...holidays]}
            categoryColorMap={categoryColorMap}
            onDateClick={openComposerForDate}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
          />
          <aside className="hidden lg:block">
            <TodoPanel />
          </aside>
        </div>

        <section className="mt-6 lg:hidden">
          <div className="panel-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Mobile</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Stacked dashboard flow</h2>
              </div>
              <button
                className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white dark:bg-cyan-300 dark:text-slate-950"
                onClick={() => setMobileDrawerOpen(true)}
                type="button"
              >
                View todos
              </button>
            </div>
          </div>
        </section>
      </main>

      <EventComposer
        categories={categories}
        form={eventForm}
        loading={eventSubmitting}
        onChange={(patch) => setEventForm((current) => ({ ...current, ...patch }))}
        onClose={resetEventComposer}
        onSubmit={() => void handleCreateEvent()}
        onToggleWeekday={handleToggleWeekday}
        open={eventComposerOpen}
      />

      <EventModal
        open={editModalState.mode === "edit"}
        onClose={closeEditModal}
        mode="edit"
        eventId={editModalState.mode === "edit" ? editModalState.eventId : undefined}
        initialValues={
          editModalState.mode === "edit" ? editModalState.initialValues : undefined
        }
      />

      <HolidayModal
        open={holidayModalData !== null}
        onClose={() => setHolidayModalData(null)}
        holiday={holidayModalData}
      />

      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition lg:hidden dark:bg-slate-950/70 ${mobileDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] transition duration-300 ease-out lg:hidden ${mobileDrawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="mx-auto max-w-2xl px-3 pb-3">
          <div className="mb-2 flex justify-center">
            <button
              aria-label="Close todo drawer"
              className="h-1.5 w-16 rounded-full bg-slate-900/20 dark:bg-white/30"
              onClick={() => setMobileDrawerOpen(false)}
              type="button"
            />
          </div>
          <TodoPanel mobile />
        </div>
      </div>

      {/* Schedule with AI floating button */}
      <button
        aria-label="Open AI assistant"
        className={`fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-500/30 active:scale-95 dark:bg-violet-500 dark:hover:bg-violet-600 ${
          aiPanelOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onClick={() => setAiPanelOpen(true)}
        type="button"
      >
        <Sparkles size={16} />
        Schedule with AI
      </button>

      <AIAssistant open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
    </div>
  );
}
