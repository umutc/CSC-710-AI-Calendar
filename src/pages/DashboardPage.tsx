import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router";
import {
  Calendar,
  LogOut,
  Settings,
  Sparkles,
  CheckSquare,
} from "lucide-react";

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100">
              Dayforma
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-2 px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50">
              Dashboard
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-slate-400">
              {profile?.display_name ?? user?.email}
            </span>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-all"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Placeholder body ────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            Welcome, {profile?.display_name ?? "there"} 👋
          </h2>
          <p className="text-slate-400 mb-12">
            Your dashboard is coming in the next sprint. Here's what's ahead:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Calendar card */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-200 mb-1">Calendar</h3>
              <p className="text-xs text-slate-500">
                Month · Week · Day · Agenda
              </p>
            </div>

            {/* Todos card */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-200 mb-1">Todos</h3>
              <p className="text-xs text-slate-500">
                Quick add · Prioritize · Schedule
              </p>
            </div>

            {/* AI card */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-200 mb-1">AI Assistant</h3>
              <p className="text-xs text-slate-500">
                Natural language · Voice · Undo
              </p>
            </div>
          </div>

          {/* Account info */}
          <div className="mt-12 glass-card rounded-2xl p-6 max-w-md mx-auto text-left">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Your Account
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-300">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Display Name</dt>
                <dd className="text-slate-300">
                  {profile?.display_name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Timezone</dt>
                <dd className="text-slate-300">{profile?.timezone ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
