import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      aria-label={label}
      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-cyan-300"
      onClick={() => {
        void toggle();
      }}
      title={label}
      type="button"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
