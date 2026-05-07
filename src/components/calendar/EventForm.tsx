import { useEffect, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, type EventFormValues } from "../../lib/schemas/event";
import { useCategories } from "../../hooks/useCategories";

interface EventFormProps {
  defaultValues: Partial<EventFormValues>;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  extraFooter?: ReactNode;
}

const EMPTY_VALUES: EventFormValues = {
  title: "",
  description: null,
  all_day: false,
  start_local: "",
  end_local: "",
  category_id: null,
  rrule: null,
  reminder_offset_minutes: null,
};

export default function EventForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  extraFooter,
}: EventFormProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });

  const allDay = watch("all_day");

  useEffect(() => {
    const { start_local, end_local } = getValues();
    if (allDay) {
      const stripTime = (v: string) => (v && v.includes("T") ? v.split("T")[0] : v);
      setValue("start_local", stripTime(start_local), { shouldValidate: false });
      setValue("end_local", stripTime(end_local), { shouldValidate: false });
    } else {
      const addTime = (v: string, hh: string) =>
        v && !v.includes("T") ? `${v}T${hh}` : v;
      setValue("start_local", addTime(start_local, "09:00"), { shouldValidate: false });
      setValue("end_local", addTime(end_local, "10:00"), { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDay]);

  const inputBase =
    "w-full rounded-md border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";
  const labelBase = "text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block";
  const errorBase = "text-red-600 dark:text-red-300 text-xs mt-1";

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit(onSubmit)();
    }
  };

  return (
    <form onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div>
        <label htmlFor="event-title" className={labelBase}>
          Title
        </label>
        <input
          id="event-title"
          type="text"
          autoFocus
          className={inputBase}
          placeholder="Event title"
          {...register("title")}
        />
        {errors.title && <p className={errorBase}>{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="event-description" className={labelBase}>
          Description
        </label>
        <textarea
          id="event-description"
          rows={3}
          className={inputBase}
          placeholder="Optional notes"
          {...register("description")}
        />
        {errors.description && (
          <p className={errorBase}>{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="event-all-day"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
          {...register("all_day")}
        />
        <label
          htmlFor="event-all-day"
          className="text-sm text-slate-700 dark:text-slate-300 select-none"
        >
          All day
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-start" className={labelBase}>
            Start
          </label>
          <input
            id="event-start"
            type={allDay ? "date" : "datetime-local"}
            className={inputBase}
            {...register("start_local")}
          />
          {errors.start_local && (
            <p className={errorBase}>{errors.start_local.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="event-end" className={labelBase}>
            End
          </label>
          <input
            id="event-end"
            type={allDay ? "date" : "datetime-local"}
            className={inputBase}
            {...register("end_local")}
          />
          {errors.end_local && (
            <p className={errorBase}>{errors.end_local.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="event-category" className={labelBase}>
          Category
        </label>
        <select
          id="event-category"
          className={inputBase}
          disabled={categoriesLoading}
          {...register("category_id", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
        >
          <option value="">(none)</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="event-reminder" className={labelBase}>
          Reminder offset (minutes before)
        </label>
        <input
          id="event-reminder"
          type="number"
          min={0}
          max={43200}
          step={5}
          className={inputBase}
          placeholder="e.g. 15"
          {...register("reminder_offset_minutes", {
            setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
          })}
        />
        {errors.reminder_offset_minutes && (
          <p className={errorBase}>{errors.reminder_offset_minutes.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div>{extraFooter}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
          >
            {isSubmitting ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
