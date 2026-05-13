import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

interface NotificationsToggleProps {
  /**
   * Optional callback so the parent (typically `DashboardPage`) can wire the
   * resulting permission into a scheduler hook like `useEventReminders`.
   * Fires on mount with the initial value and on every change thereafter.
   */
  onPermissionChange?: (permission: NotificationPermissionState) => void;
}

function readInitialPermission(): NotificationPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * Small header-bar button that requests Notification permission on click.
 *
 * - Stays available when permission is `default` or `denied` so the user
 *   can re-trigger the prompt at any time.
 * - When granted, collapses to a subtle "Notifications enabled" indicator.
 * - When the browser doesn't support `Notification` at all, renders a
 *   muted, disabled chip explaining why.
 *
 * Per spec: this component never asks for permission automatically — only
 * the explicit click invokes `Notification.requestPermission()`.
 */
export default function NotificationsToggle({
  onPermissionChange,
}: NotificationsToggleProps) {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    readInitialPermission
  );
  const [requesting, setRequesting] = useState(false);

  // Notify the parent on mount and whenever permission flips.
  useEffect(() => {
    onPermissionChange?.(permission);
  }, [permission, onPermissionChange]);

  const handleRequest = useCallback(async () => {
    if (permission === "unsupported") return;
    if (typeof Notification === "undefined") return;
    if (requesting) return;

    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Notifications enabled");
      } else if (result === "denied") {
        toast.error(
          "Notifications blocked — re-enable them in your browser site settings."
        );
      } else {
        // User dismissed the prompt — keep the button visible so they can
        // try again later.
        toast.message("Notifications dismissed");
      }
    } catch (err) {
      console.warn("Notification permission request failed:", err);
      toast.error("Could not request notification permission");
    } finally {
      setRequesting(false);
    }
  }, [permission, requesting]);

  if (permission === "unsupported") {
    return (
      <span
        aria-label="Notifications not supported in this browser"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs text-slate-400 dark:text-slate-500"
        title="Notifications not supported in this browser"
      >
        <BellOff className="h-5 w-5" />
      </span>
    );
  }

  if (permission === "granted") {
    return (
      <span
        aria-label="Notifications enabled"
        className="inline-flex items-center gap-1.5 rounded-full p-2 text-cyan-700 dark:text-cyan-300"
        title="Notifications enabled"
      >
        <BellRing className="h-5 w-5" />
      </span>
    );
  }

  return (
    <button
      aria-label="Enable browser notifications"
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-900/10 transition hover:bg-slate-900/[0.06] hover:text-cyan-700 disabled:opacity-50 dark:text-slate-400 dark:ring-slate-700/50 dark:hover:bg-slate-800/60 dark:hover:text-cyan-300"
      disabled={requesting}
      onClick={() => {
        void handleRequest();
      }}
      title="Enable browser notifications"
      type="button"
    >
      <Bell className="h-4 w-4" />
      <span className="hidden sm:inline">
        {requesting ? "Requesting…" : "Enable notifications"}
      </span>
    </button>
  );
}
