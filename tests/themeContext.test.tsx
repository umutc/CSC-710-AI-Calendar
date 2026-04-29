import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

const mockAuth = {
  user: null as { id: string } | null,
  profile: null as { theme_preference?: string } | null,
};

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => mockAuth,
}));

import { ThemeProvider } from "../src/contexts/ThemeContext";
import { useTheme } from "../src/hooks/useTheme";
import { THEME_STORAGE_KEY } from "../src/lib/themeUtils";

function ThemeProbe() {
  const { preference, resolved, toggle, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => void toggle()} type="button">
        toggle
      </button>
      <button onClick={() => void setPreference("system")} type="button">
        set-system
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockAuth.user = null;
    mockAuth.profile = null;
    // matchMedia stub: prefers light by default
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark") ? false : true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("seeds 'system' preference and applies data-theme on mount", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggle flips the resolved theme and updates html attribute", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    await act(async () => {
      await user.click(screen.getByText("toggle"));
    });
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setPreference('system') reverts to the system preference", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    await act(async () => {
      await user.click(screen.getByText("set-system"));
    });
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });
});
