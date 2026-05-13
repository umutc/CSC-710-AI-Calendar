import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_STORAGE_KEY = "dayforma:browser-warning-dismissed";

/**
 * Returns true when the current browser is Chromium-based and identifies as
 * Chrome or Edge (or a derivative like Brave, Opera, Vivaldi). We rely on
 * `navigator.userAgentData.brands` when available (Chromium 90+) and fall back
 * to user-agent string sniffing for older Chromium and for browsers that don't
 * expose the brands API.
 */
function isChromeOrEdge(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (
    navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }
  ).userAgentData;
  if (uaData?.brands && Array.isArray(uaData.brands)) {
    const brandNames = uaData.brands.map((b) => b.brand.toLowerCase());
    const chromiumish = brandNames.some(
      (name) =>
        name.includes("chromium") ||
        name.includes("google chrome") ||
        name.includes("microsoft edge") ||
        name.includes("brave") ||
        name.includes("opera"),
    );
    if (chromiumish) return true;
  }

  const ua = navigator.userAgent || "";
  // Safari is the main browser we explicitly want to exclude even though it
  // shares the "Safari/" token with Chrome's user-agent string.
  const isEdge = /Edg\//i.test(ua);
  const isOpera = /(OPR|Opera)\//i.test(ua);
  const isBrave = /Brave\//i.test(ua);
  const isChrome = /Chrome\//i.test(ua) && !isOpera && !isEdge;
  const isSafari = /Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/Edg\//i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);

  if (isSafari || isFirefox) return false;
  return isEdge || isChrome || isBrave || isOpera;
}

/**
 * Detect whether the SpeechRecognition API is available on `window`.
 */
function hasSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]);
}

/**
 * Dismissible warning banner shown when the current browser is not Chrome/Edge
 * or when the SpeechRecognition API is unavailable. The dismissal state is
 * persisted in `localStorage` so it does not reappear on every reload.
 */
export default function BrowserSupportBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_STORAGE_KEY) === "true";
    } catch {
      // localStorage may be unavailable (e.g. Safari private mode). Treat as
      // not dismissed so we still warn the user.
      dismissed = false;
    }

    if (dismissed) {
      setVisible(false);
      return;
    }

    const chromeOrEdge = isChromeOrEdge();
    const speechOk = hasSpeechRecognition();
    setVisible(!chromeOrEdge || !speechOk);
  }, []);

  function handleDismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors — at worst the banner returns on next reload.
    }
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mb-4 flex max-w-7xl items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
      <p className="flex-1 leading-relaxed">
        Voice features require Chrome or Edge. You can still use Dayforma without voice.
      </p>
      <button
        type="button"
        aria-label="Dismiss browser support warning"
        onClick={handleDismiss}
        className="rounded-md p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-amber-200 dark:hover:bg-amber-500/20 dark:hover:text-amber-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
