import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
} from "../src/lib/themeUtils";

describe("resolveTheme", () => {
  it("returns 'light' when preference is 'light' (system irrelevant)", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("light", "light")).toBe("light");
  });

  it("returns 'dark' when preference is 'dark' (system irrelevant)", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("dark", "dark")).toBe("dark");
  });

  it("falls back to system preference when 'system'", () => {
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", "dark")).toBe("dark");
  });
});

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredPreference()).toBeNull();
  });

  it("round-trips a valid preference", () => {
    writeStoredPreference("dark");
    expect(readStoredPreference()).toBe("dark");
    writeStoredPreference("light");
    expect(readStoredPreference()).toBe("light");
    writeStoredPreference("system");
    expect(readStoredPreference()).toBe("system");
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "neon");
    expect(readStoredPreference()).toBeNull();
  });
});
