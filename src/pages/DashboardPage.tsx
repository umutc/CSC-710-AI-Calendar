import { useState } from "react";
import { useNavigate } from "react-router";
import { format, isThisWeek, isToday, isTomorrow, parseISO } from "date-fns";
import { Calendar, LogOut, Settings } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTodos } from "../hooks/useTodos";
import CalendarView from "../components/calendar/CalendarView";
import type { Priority, Todo } from "../types";

type AgendaEvent = {
  title: string;
  time: string;
  category: string;
  tone: string;
};

const agenda: AgendaEvent[] = [
  { title: "Daily standup", time: "09:00", category: "Team", tone: "sky" },
  { title: "Calendar drop UX pass", time: "11:00", category: "Design", tone: "rose" },
  { title: "AI scheduling sync", time: "14:00", category: "Build", tone: "amber" },
  { title: "Evening study block", time: "19:00", category: "Focus", tone: "emerald" },
];

function priorityClasses(priority: Priority) {
  switch (priority) {
    case "urgent":
      return "bg-red-500/20 text-red-200";
    case "high":
      return "bg-rose-500/15 text-rose-200";
    case "medium":
      return "bg-amber-500/15 text-amber-200";
    case "low":
    default:
      return "bg-sky-500/15 text-sky-200";
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
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
              Dayforma Dashboard
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Your day, mapped and movable
              </h1>
              <p className="text-sm text-slate-300">
                Welcome back, {displayName}. Calendar on the left, action queue on the right.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs text-slate-400 sm:inline-flex">
            Dashboard
          </span>
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
          <button
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-cyan-300"
            onClick={onOpenSettings}
            title="Settings"
            type="button"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-red-400"
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

function CalendarPanel() {
  return (
    <section className="space-y-6">
      <div className="panel-surface overflow-hidden p-4 sm:p-6">
        <CalendarView />
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

function TodoRow({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) {
  const done = todo.status === "done";
  return (
    <article
      className={`rounded-3xl border px-4 py-4 ${
        done
          ? "border-white/8 bg-white/[0.03] text-slate-400"
          : "border-white/10 bg-slate-900/70 text-slate-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={done ? "Mark as pending" : "Mark as done"}
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border transition ${
            done
              ? "border-emerald-300 bg-emerald-300"
              : "border-slate-500 hover:border-emerald-300"
          }`}
          onClick={() => onToggle(todo.id)}
          type="button"
        />
        <div className="flex-1">
          <p className={`font-medium ${done ? "line-through" : ""}`}>{todo.title}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/8 px-3 py-1 text-slate-300">
              {formatDue(todo.due_at)}
            </span>
            <span className={`rounded-full px-3 py-1 ${priorityClasses(todo.priority)}`}>
              {priorityLabel(todo.priority)}
            </span>
            {todo.status === "scheduled" && (
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-200">
                Scheduled
              </span>
            )}
            {todo.created_by_ai && (
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">
                AI
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TodoPanel({ mobile = false }: { mobile?: boolean }) {
  const { todos, loading, error, createTodo, toggleStatus } = useTodos();
  const activeCount = todos.filter((t) => t.status !== "done").length;

  async function handleNewTodo() {
    const title = window.prompt("New todo title");
    if (!title || !title.trim()) return;
    await createTodo({ title: title.trim() });
  }

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
            {activeCount} active
          </span>
        </div>

        <button
          className="mt-5 rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          onClick={handleNewTodo}
          type="button"
        >
          + New todo
        </button>

        <div className="mt-5 space-y-3">
          {loading && (
            <p className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
              Loading todos…
            </p>
          )}
          {!loading && error && (
            <p className="rounded-3xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
              {error}
            </p>
          )}
          {!loading && !error && todos.length === 0 && (
            <p className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
              No todos yet. Tap “+ New todo” to add one.
            </p>
          )}
          {!loading &&
            todos.map((todo) => (
              <TodoRow key={todo.id} todo={todo} onToggle={toggleStatus} />
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

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] text-slate-100">
      <DashboardHeader
        displayName={profile?.display_name ?? user?.email ?? "there"}
        onLogout={handleLogout}
        onOpenSettings={() => navigate("/settings")}
        onOpenTodos={() => setMobileDrawerOpen(true)}
      />

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
