import { useEffect, useState, useRef, useLayoutEffect, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

function CategorySelect({
  value,
  onChange,
  categories,
  disabled
}: {
  value: string | null;
  onChange: (val: string | null) => void;
  categories: { id: string; name: string; color?: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 99999, // ensures it sits on top of everything
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
    if (open) {
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedCat = categories.find((c) => c.id === value);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedCat ? (
            <>
              <div
                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: selectedCat.color }}
              />
              <span className="truncate">{selectedCat.name}</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
              <span className="truncate">None</span>
            </>
          )}
        </div>
        <svg className="h-4 w-4 text-slate-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && !disabled && createPortal(
        <div 
          ref={dropdownRef} 
          style={dropdownStyle} 
          className="max-h-60 overflow-auto rounded-md bg-white py-1 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-800 dark:ring-slate-700"
        >
          <button
            type="button"
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${
              !value ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
            }`}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
            <span className="truncate">None</span>
          </button>
          
          {categories.map((c) => {
            const isSelected = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${
                  isSelected ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                <div
                  className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

function EventForm({
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

      <div className="mb-4">
        <label className={labelBase}>Category</label>
        <div className="mt-1">
          <CategorySelect
            value={watch("category_id") ?? null}
            onChange={(val) => setValue("category_id", val, { shouldValidate: true })}
            categories={categories || []}
            disabled={categoriesLoading}
          />
        </div>
      </div>

      <div>
        <label className={labelBase}>Reminder</label>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {[
            { label: "None", value: null },
            { label: "At time", value: 0 },
            { label: "5m before", value: 5 },
            { label: "15m before", value: 15 },
            { label: "30m before", value: 30 },
            { label: "1h before", value: 60 },
            { label: "1d before", value: 1440 },
          ].map((opt) => {
            const isSelected = watch("reminder_offset_minutes") === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  setValue("reminder_offset_minutes", opt.value, {
                    shouldValidate: true,
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-500"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
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

import React from "react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      (window as any).__lastError = this.state.error;
      return <div id="error-boundary-msg" className="p-4 text-red-500 bg-red-50 border border-red-500 overflow-auto">
        <h2 className="font-bold">EventForm Crashed!</h2>
        <pre className="text-xs">{String(this.state.error?.stack || this.state.error)}</pre>
      </div>;
    }
    return this.props.children;
  }
}

export default function EventFormWrapper(props: EventFormProps) {
  return <ErrorBoundary><EventForm {...props} /></ErrorBoundary>;
}
