import { useEffect, useState } from "react";
import { toast } from "sonner";
import Modal from "../common/Modal";
import EventForm from "./EventForm";
import { useEvents } from "../../hooks/useEvents";
import type { EventFormValues } from "../../lib/schemas/event";

export interface EventModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  eventId?: string;
  initialValues?: Partial<EventFormValues>;
}

const CONFIRM_DELETE_MS = 3000;

function toIsoFromLocal(local: string, allDayBoundary?: "start" | "end"): string {
  if (allDayBoundary && !local.includes("T")) {
    const suffix = allDayBoundary === "start" ? "T00:00:00.000" : "T23:59:59.999";
    return new Date(`${local}${suffix}`).toISOString();
  }
  return new Date(local).toISOString();
}

export default function EventModal({
  open,
  onClose,
  mode,
  eventId,
  initialValues,
}: EventModalProps) {
  const { createEvent, updateEvent, deleteEvent } = useEvents();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) return;
    const t = window.setTimeout(() => setConfirmingDelete(false), CONFIRM_DELETE_MS);
    return () => window.clearTimeout(t);
  }, [confirmingDelete]);

  useEffect(() => {
    if (!open) setConfirmingDelete(false);
  }, [open]);

  const handleSubmit = async (values: EventFormValues) => {
    const description =
      values.description && values.description.trim().length > 0
        ? values.description.trim()
        : null;

    const start_at = toIsoFromLocal(
      values.start_local,
      values.all_day ? "start" : undefined
    );
    const end_at = toIsoFromLocal(
      values.end_local,
      values.all_day ? "end" : undefined
    );

    const reminder =
      values.reminder_offset_minutes === undefined
        ? null
        : values.reminder_offset_minutes;

    if (mode === "create") {
      await createEvent({
        title: values.title.trim(),
        description,
        start_at,
        end_at,
        all_day: values.all_day,
        category_id: values.category_id ?? null,
        rrule: null,
        reminder_offset_minutes: reminder,
      });
      toast.success("Event created");
    } else if (mode === "edit" && eventId) {
      await updateEvent(eventId, {
        title: values.title.trim(),
        description,
        start_at,
        end_at,
        all_day: values.all_day,
        category_id: values.category_id ?? null,
        reminder_offset_minutes: reminder,
      });
      toast.success("Event updated");
    }
    onClose();
  };

  const handleDeleteClick = async () => {
    if (!eventId) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteEvent(eventId);
    toast.success("Event deleted");
    onClose();
  };

  const deleteButton =
    mode === "edit" && eventId ? (
      <button
        type="button"
        onClick={handleDeleteClick}
        className={`px-4 py-2 rounded-md text-sm font-medium transition ${
          confirmingDelete
            ? "bg-red-600 text-white hover:bg-red-700"
            : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        }`}
      >
        {confirmingDelete ? "Click again to confirm" : "Delete"}
      </button>
    ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New event" : "Edit event"}
    >
      <EventForm
        defaultValues={initialValues ?? {}}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel={mode === "create" ? "Create" : "Save"}
        extraFooter={deleteButton}
      />
    </Modal>
  );
}
