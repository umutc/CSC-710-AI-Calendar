import { X, Calendar } from "lucide-react";

interface HolidayModalProps {
  open: boolean;
  onClose: () => void;
  holiday: {
    title: string;
    description?: string;
    date: string;
    type?: string;
  } | null;
}

export default function HolidayModal({ open, onClose, holiday }: HolidayModalProps) {
  if (!open || !holiday) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-slate-950/70"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-slate-900/10 px-6 py-4 dark:border-white/10">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Official Holiday
            </h2>
            <button
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-900/[0.06] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${holiday.type === 'public' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {holiday.title}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {new Date(`${holiday.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-900/[0.08] bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {holiday.description || "An official public holiday."}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
