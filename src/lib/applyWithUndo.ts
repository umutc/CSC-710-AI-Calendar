import { toast } from "sonner";

export interface MutationRecord {
  type: "create_event" | "update_event" | "delete_event" | "create_todo";
  id: string;
  snapshot: Record<string, unknown> | null;
}

const UNDO_TIMEOUT_MS = 30_000;

export function applyWithUndo(label: string, undoFn: () => Promise<void>): void {
  toast(label, {
    duration: UNDO_TIMEOUT_MS,
    action: {
      label: "Undo",
      onClick: () => void undoFn(),
    },
  });
}
