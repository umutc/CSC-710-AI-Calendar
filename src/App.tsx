import { useState } from "react";

type CalendarEvent = {
  title: string;
  time: string;
  category: string;
  tone: string;
};

type TodoItem = {
  title: string;
  due: string;
  priority: string;
  done?: boolean;
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthCells = [
  { day: 30, muted: true },
  { day: 31, muted: true },
  {
    day: 1,
    events: [{ title: "Sprint kickoff", time: "9:00 AM", category: "Team", tone: "sky" }],
  },
  { day: 2 },
  {
    day: 3,
    events: [{ title: "Voice prototype", time: "1:30 PM", category: "Build", tone: "amber" }],
  },
  { day: 4 },
  { day: 5 },
  {
    day: 6,
    events: [{ title: "Office hours", time: "10:00 AM", category: "Campus", tone: "emerald" }],
  },
  { day: 7 },
  { day: 8 },
  {
    day: 9,
    events: [{ title: "UX review", time: "11:00 AM", category: "Design", tone: "rose" }],
  },
  { day: 10 },
  {
    day: 11,
    events: [{ title: "AI parser QA", time: "3:00 PM", category: "QA", tone: "violet" }],
  },
  { day: 12 },
  { day: 13 },
  {
    day: 14,
    events: [{ title: "Demo dry run", time: "2:00 PM", category: "Team", tone: "sky" }],
  },
  { day: 15, selected: true },
  { day: 16 },
  {
    day: 17,
    events: [{ title: "Database check-in", time: "4:00 PM", category: "Backend", tone: "amber" }],
  },
  { day: 18 },
  { day: 19 },
  {
    day: 20,
    events: [{ title: "Study block", time: "6:30 PM", category: "Focus", tone: "emerald" }],
  },
  { day: 21 },
  { day: 22 },
  {
    day: 23,
    events: [{ title: "Presentation polish", time: "12:00 PM", category: "Slides", tone: "rose" }],
  },
  { day: 24 },
  { day: 25 },
  {
    day: 26,
    events: [{ title: "Feedback pass", time: "9:30 AM", category: "Review", tone: "violet" }],
  },
  { day: 27 },
  { day: 28 },
  {
    day: 29,
    events: [{ title: "Launch checklist", time: "5:00 PM", category: "Ops", tone: "sky" }],
  },
  { day: 30 },
  { day: 1, muted: true },
  { day: 2, muted: true },
  { day: 3, muted: true },
];

const agenda: CalendarEvent[] = [
  { title: "Daily standup", time: "09:00", category: "Team", tone: "sky" },
  { title: "Calendar drop UX pass", time: "11:00", category: "Design", tone: "rose" },
  { title: "AI scheduling sync", time: "14:00", category: "Build", tone: "amber" },
  { title: "Evening study block", time: "19:00", category: "Focus", tone: "emerald" },
];

const todos: TodoItem[] = [
  { title: "Connect dashboard cards to live Supabase queries", due: "Today", priority: "High" },
  { title: "Refine drag target states for event drop", due: "Tomorrow", priority: "Medium" },
  { title: "Add empty state illustration for no todos", due: "Fri", priority: "Low", done: true },
  { title: "Write responsive drawer interaction tests", due: "Mon", priority: "High" },
];

function toneClasses(tone: string) {
  switch (tone) {
    case "sky":
      return "bg-sky-500/15 text-sky-200 ring-sky-400/30";
    case "amber":
      return "bg-amber-500/15 text-amber-200 ring-amber-400/30";
    case "emerald":
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30";
    case "rose":
      return "bg-rose-500/15 text-rose-200 ring-rose-400/30";
    case "violet":
      return "bg-violet-500/15 text-violet-200 ring-violet-400/30";
    default:
      return "bg-white/10 text-white ring-white/15";
  }
}

function Header({ onOpenTodos }: { onOpenTodos: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            Dayforma Dashboard
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Your day, mapped and movable
            </h1>
            <p className="text-sm text-slate-300">
              Calendar on the left, action queue on the right, with room for AI controls next.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10 sm:inline-flex"
            type="button"
          >
            Week view
          </button>
          <button
            className="inline-flex rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 lg:hidden"
            onClick={onOpenTodos}
            type="button"
          >
            Open todos
          </button>
        </div>
      </div>
    </header>
  );
}

function CalendarPanel() {
  return (
    <section className="space-y-6">
      <div className="panel-surface overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Calendar</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">May 2026</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Month", "Week", "Day", "Agenda"].map((view, index) => (
              <button
                key={view}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  index === 0
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
                type="button"
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {weekDays.map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthCells.map((cell, index) => (
            <article
              key={`${cell.day}-${index}`}
              className={`min-h-28 rounded-3xl border p-3 transition sm:min-h-32 ${
                cell.selected
                  ? "border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.2)]"
                  : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
              } ${cell.muted ? "text-slate-500" : "text-slate-100"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{cell.day}</span>
                {cell.selected ? (
                  <span className="rounded-full bg-cyan-300/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Today
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {cell.events?.map((event) => (
                  <div
                    key={event.title}
                    className={`rounded-2xl px-2.5 py-2 text-xs ring-1 ${toneClasses(event.tone)}`}
                  >
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-1 text-[11px] opacity-80">{event.time}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="panel-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Today</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Agenda snapshots</h3>
            </div>
            <button
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              type="button"
            >
              Add event
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {agenda.map((item) => (
              <div
                key={`${item.time}-${item.title}`}
                className="flex items-center gap-4 rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4"
              >
                <div className="w-16 shrink-0 text-sm font-semibold text-slate-200">{item.time}</div>
                <div className="flex-1">
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-sm text-slate-400">{item.category}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ring-1 ${toneClasses(item.tone)}`}>
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-surface p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Insights</p>
          <h3 className="mt-2 text-xl font-semibold text-white">AI scheduling lane</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-300/10 p-4 text-slate-100">
              <p className="text-sm font-semibold text-cyan-100">Best focus block</p>
              <p className="mt-2 text-2xl font-semibold">3:30 PM - 5:00 PM</p>
              <p className="mt-2 text-sm text-cyan-50/80">
                Wide open after your team sync, before evening errands start.
              </p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Collision watch</p>
              <p className="mt-2 text-sm text-slate-300">
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

function TodoPanel({ mobile = false }: { mobile?: boolean }) {
  return (
    <section className="flex h-full flex-col">
      <div className={`panel-surface flex h-full flex-col ${mobile ? "rounded-t-[2rem] p-5" : "p-5"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Tasks</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Todo panel</h2>
            <p className="mt-2 text-sm text-slate-300">
              A flexible side rail for tasks, quick capture, and scheduling actions.
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            3 active
          </span>
        </div>

        <button
          className="mt-5 rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          type="button"
        >
          + New todo
        </button>

        <div className="mt-5 space-y-3">
          {todos.map((todo) => (
            <article
              key={todo.title}
              className={`rounded-3xl border px-4 py-4 ${
                todo.done
                  ? "border-white/8 bg-white/[0.03] text-slate-400"
                  : "border-white/10 bg-slate-900/70 text-slate-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-4 w-4 rounded-full border ${
                    todo.done ? "border-emerald-300 bg-emerald-300" : "border-slate-500"
                  }`}
                />
                <div className="flex-1">
                  <p className={`font-medium ${todo.done ? "line-through" : ""}`}>{todo.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white/8 px-3 py-1 text-slate-300">{todo.due}</span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        todo.priority === "High"
                          ? "bg-rose-500/15 text-rose-200"
                          : todo.priority === "Medium"
                            ? "bg-amber-500/15 text-amber-200"
                            : "bg-sky-500/15 text-sky-200"
                      }`}
                    >
                      {todo.priority}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Mobile drawer behavior</p>
          <p className="mt-2 text-sm text-slate-300">
            On smaller screens this panel slides up as a drawer, so the calendar stays primary and
            the task queue remains one tap away.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] text-slate-100">
      <Header onOpenTodos={() => setMobileDrawerOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
          <CalendarPanel />
          <aside className="hidden lg:block">
            <TodoPanel />
          </aside>
        </div>

        <section className="mt-6 lg:hidden">
          <div className="panel-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Mobile</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Stacked dashboard flow</h2>
              </div>
              <button
                className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={() => setMobileDrawerOpen(true)}
                type="button"
              >
                View todos
              </button>
            </div>
          </div>
        </section>
      </main>

      <div
        className={`fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition lg:hidden ${
          mobileDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] transition duration-300 ease-out lg:hidden ${
          mobileDrawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-2xl px-3 pb-3">
          <div className="mb-2 flex justify-center">
            <button
              aria-label="Close todo drawer"
              className="h-1.5 w-16 rounded-full bg-white/30"
              onClick={() => setMobileDrawerOpen(false)}
              type="button"
            />
          </div>
          <TodoPanel mobile />
        </div>
      </div>
    </div>
  );
}
