import { useNavigate } from "react-router";
import { Calendar, Mic, Undo2, Sparkles, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI that plans with you",
    description:
      "Type naturally — \"dentist tomorrow at 3\" — and Claude creates the event for you.",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    icon: Mic,
    title: "Voice-first scheduling",
    description:
      "Press the mic, speak your task, and watch your calendar update hands-free.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Undo2,
    title: "Undo anything",
    description:
      "Every AI action comes with a 30-second undo toast. Zero-risk automation.",
    gradient: "from-amber-500 to-orange-500",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ── Background grid pattern ─────────────────────────────────────── */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.06] dark:opacity-[0.03]" />

      {/* ── Gradient orbs ───────────────────────────────────────────────── */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/15 blur-[120px] animate-float dark:bg-indigo-600/20" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[100px] animate-float-delayed dark:bg-violet-600/15" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <header className="text-center max-w-3xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/[0.04] border border-slate-900/10 text-xs text-slate-600 mb-8 backdrop-blur-sm dark:bg-slate-800/60 dark:border-slate-700/50 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>CSC 710 · Software Engineering</span>
          </div>

          {/* Wordmark */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-slate-400">
              Dayforma
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl text-slate-600 font-light mb-10 dark:text-slate-400">
            Shape your day.
          </p>

          {/* CTA */}
          <button
            id="landing-start-btn"
            onClick={() => navigate("/login")}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-[0.98] transition-all duration-200"
          >
            Start
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </header>

        {/* ── Feature cards ────────────────────────────────────────────── */}
        <section className="mt-24 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass-card group rounded-2xl p-6 animate-slide-up"
                style={{ animationDelay: `${i * 100 + 200}ms` }}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-slate-100">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="mt-20 mb-8 text-center animate-fade-in" style={{ animationDelay: "600ms" }}>
          <p className="text-xs text-slate-500 dark:text-slate-600">
            Built by Umut Çelik · Merve Gazi · Justin Huang
          </p>
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-700">
            CSC 710 · CUNY College of Staten Island · Spring 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
