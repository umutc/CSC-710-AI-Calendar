import { useNavigate } from "react-router";
import { Calendar, ArrowLeft, User, Bell, CalendarDays, Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const settingsSections = [
  {
    id: "profile",
    icon: User,
    title: "Profile",
    description: "Manage your display name, email, and avatar.",
    tone: "cyan",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    description: "Configure push, email, and in-app notification preferences.",
    tone: "amber",
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Calendar Preferences",
    description: "Set default view, first day of week, and time zone.",
    tone: "emerald",
  },
  {
    id: "account",
    icon: Shield,
    title: "Account & Security",
    description: "Password, two-factor authentication, and connected accounts.",
    tone: "rose",
  },
] as const;

function toneClasses(tone: string) {
  switch (tone) {
    case "cyan":
      return "from-cyan-600 to-sky-600";
    case "amber":
      return "from-amber-600 to-orange-600";
    case "emerald":
      return "from-emerald-600 to-teal-600";
    case "rose":
      return "from-rose-600 to-pink-600";
    default:
      return "from-indigo-600 to-violet-600";
  }
}

function toneRing(tone: string) {
  switch (tone) {
    case "cyan":
      return "border-cyan-400/20 hover:border-cyan-400/40";
    case "amber":
      return "border-amber-400/20 hover:border-amber-400/40";
    case "emerald":
      return "border-emerald-400/20 hover:border-emerald-400/40";
    case "rose":
      return "border-rose-400/20 hover:border-rose-400/40";
    default:
      return "border-white/10 hover:border-white/20";
  }
}

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                Dayforma Settings
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Settings
              </h1>
            </div>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            onClick={() => navigate("/dashboard")}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* User info banner */}
        <div className="panel-surface mb-8 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-bold text-white">
              {(profile?.display_name ?? user?.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {profile?.display_name ?? "User"}
              </h2>
              <p className="text-sm text-slate-400">{user?.email ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Settings cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <article
                key={section.id}
                className={`group cursor-pointer rounded-3xl border bg-white/[0.03] p-5 transition hover:bg-white/[0.06] ${toneRing(section.tone)}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses(section.tone)}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {section.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Placeholder note */}
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-5">
          <p className="text-sm font-semibold text-white">Coming soon</p>
          <p className="mt-2 text-sm text-slate-300">
            Individual settings panels will be wired up in upcoming sprints.
            This page serves as the routing scaffold for{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-cyan-200">
              /settings
            </code>.
          </p>
        </div>
      </main>
    </div>
  );
}
