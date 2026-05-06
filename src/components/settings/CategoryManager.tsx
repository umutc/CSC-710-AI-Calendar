import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import type { Category } from "../../types";

const PRESET_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f43f5e",
];

const DEFAULT_NEW_COLOR = PRESET_COLORS[0];
const CONFIRM_DELETE_MS = 3000;

const inputBase =
  "w-full rounded-md border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

function ColorSwatch({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color, width: size, height: size }}
      className="inline-block rounded-full ring-1 ring-slate-900/15 dark:ring-white/15"
    />
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => {
        const active = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Pick color ${c}`}
            className={`h-7 w-7 rounded-full ring-2 transition ${
              active
                ? "ring-indigo-500 dark:ring-indigo-300 scale-110"
                : "ring-transparent hover:ring-slate-400 dark:hover:ring-slate-500"
            }`}
            style={{ backgroundColor: c }}
          />
        );
      })}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0 dark:border-slate-700 dark:bg-slate-800"
        aria-label="Custom color"
      />
    </div>
  );
}

interface CategoryRowProps {
  category: Category;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function CategoryRow({ category, onUpdate, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) {
      setName(category.name);
      setColor(category.color);
    }
  }, [editing, category.name, category.color]);

  useEffect(() => {
    if (!confirmingDelete) return;
    const t = window.setTimeout(() => setConfirmingDelete(false), CONFIRM_DELETE_MS);
    return () => window.clearTimeout(t);
  }, [confirmingDelete]);

  const startEdit = () => setEditing(true);
  const cancelEdit = () => setEditing(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    await onUpdate(category.id, { name: trimmed, color });
    setBusy(false);
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy(true);
    await onDelete(category.id);
    setBusy(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl border border-slate-900/[0.08] bg-slate-900/[0.03] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="space-y-3">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Category name"
            className={inputBase}
          />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={busy}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !name.trim()}
              className="btn-primary"
              style={{ paddingLeft: "1rem", paddingRight: "1rem" }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.08] bg-slate-900/[0.03] px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <ColorSwatch color={category.color} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {category.name}
        </p>
        {category.is_default && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Default</p>
        )}
      </div>
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Edit ${category.name}`}
        className="p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={busy}
        aria-label={
          confirmingDelete ? `Confirm delete ${category.name}` : `Delete ${category.name}`
        }
        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
          confirmingDelete
            ? "bg-red-600 text-white hover:bg-red-700"
            : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        } disabled:opacity-50`}
      >
        {confirmingDelete ? (
          "Confirm"
        ) : (
          <>
            <Trash2 size={14} />
            <span className="sr-only sm:not-sr-only">Delete</span>
          </>
        )}
      </button>
    </div>
  );
}

interface CreateRowProps {
  onCreate: (input: { name: string; color: string }) => Promise<string | null>;
}

function CreateRow({ onCreate }: CreateRowProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_NEW_COLOR);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const id = await onCreate({ name: trimmed, color });
    setBusy(false);
    if (id) {
      setName("");
      setColor(DEFAULT_NEW_COLOR);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-dashed border-slate-900/15 bg-slate-900/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.02]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ColorSwatch color={color} size={20} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            className={inputBase}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="btn-primary inline-flex items-center gap-1"
            style={{ paddingLeft: "1rem", paddingRight: "1rem" }}
          >
            <Plus size={14} />
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </div>
    </form>
  );
}

export default function CategoryManager() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useCategories();

  return (
    <div className="space-y-3">
      <CreateRow onCreate={createCategory} />

      {loading && categories.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      )}

      {!loading && categories.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No categories yet. Add your first one above.
        </p>
      )}

      {categories.map((c) => (
        <CategoryRow
          key={c.id}
          category={c}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
        />
      ))}
    </div>
  );
}
