export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "dayforma:theme-preference";

const VALID_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export function resolveTheme(
  pref: ThemePreference,
  systemPref: ResolvedTheme
): ResolvedTheme {
  if (pref === "system") return systemPref;
  return pref;
}

export function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function readStoredPreference(): ThemePreference | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    if ((VALID_PREFERENCES as string[]).includes(raw)) {
      return raw as ThemePreference;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPreference(pref: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* ignore — storage unavailable */
  }
}
