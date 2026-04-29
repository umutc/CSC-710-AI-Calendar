import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  getSystemPreference,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from "../lib/themeUtils";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => Promise<void>;
  toggle: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();

  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    return readStoredPreference() ?? "system";
  });
  const [systemPref, setSystemPref] = useState<ResolvedTheme>(() =>
    getSystemPreference()
  );

  const resolved = resolveTheme(preference, systemPref);

  // Apply data-theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  // Listen to OS-level changes when in "system" mode
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => {
      setSystemPref(event.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Bridge: when profile loads after sign-in, prefer DB value over local seed
  // (silent — does not write back to DB).
  const lastBridgedProfileTheme = useRef<ThemePreference | null>(null);
  useEffect(() => {
    const dbPref = profile?.theme_preference as ThemePreference | undefined;
    if (!dbPref) {
      lastBridgedProfileTheme.current = null;
      return;
    }
    if (dbPref === lastBridgedProfileTheme.current) return;
    lastBridgedProfileTheme.current = dbPref;
    if (dbPref !== preference) {
      setPreferenceState(dbPref);
      writeStoredPreference(dbPref);
    }
  }, [profile?.theme_preference, preference]);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      setPreferenceState(next);
      writeStoredPreference(next);
      if (user?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({ theme_preference: next })
          .eq("id", user.id);
        if (error) {
          toast.error(`Failed to save theme preference: ${error.message}`);
        }
      }
    },
    [user?.id]
  );

  const toggle = useCallback(async () => {
    const next: ThemePreference = resolved === "dark" ? "light" : "dark";
    await setPreference(next);
  }, [resolved, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
