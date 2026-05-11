import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Category } from "../types";

export interface CreateCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  createCategory: (input: CreateCategoryInput) => Promise<string | null>;
  updateCategory: (id: string, patch: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export function useCategories(): UseCategoriesResult {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const categoriesRef = useRef<Category[]>([]);
  categoriesRef.current = categories;

  useEffect(() => {
    if (!user?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        toast.error(`Failed to load categories: ${error.message}`);
        setCategories([]);
      } else {
        setCategories((data ?? []) as Category[]);
      }
      setLoading(false);
    })();

    const channelId = crypto.randomUUID();
    const channel = supabase
      .channel(`categories:${user.id}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const next = payload.new as Category;
            setCategories((prev) =>
              prev.some((c) => c.id === next.id) ? prev : [...prev, next].sort((a, b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === "UPDATE") {
            const next = payload.new as Category;
            setCategories((prev) =>
              prev.map((c) => (c.id === next.id ? next : c)).sort((a, b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            if (old?.id) {
              setCategories((prev) => prev.filter((c) => c.id !== old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<string | null> => {
      if (!user?.id) {
        toast.error("Not signed in");
        return null;
      }
      const id = crypto.randomUUID();
      const optimistic: Category = {
        id,
        user_id: user.id,
        name: input.name.trim(),
        color: input.color,
        is_default: false,
        created_at: new Date().toISOString(),
      };
      setCategories((prev) =>
        [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name))
      );

      const { error } = await supabase.from("categories").insert({
        id,
        user_id: user.id,
        name: optimistic.name,
        color: optimistic.color,
      });

      if (error) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.error(`Failed to create category: ${error.message}`);
        return null;
      }
      return id;
    },
    [user?.id]
  );

  const updateCategory = useCallback(
    async (id: string, patch: UpdateCategoryInput): Promise<void> => {
      const snapshot = categoriesRef.current.find((c) => c.id === id);
      if (!snapshot) return;
      const optimistic: Category = {
        ...snapshot,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      };
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? optimistic : c)).sort((a, b) => a.name.localeCompare(b.name))
      );

      const { error } = await supabase
        .from("categories")
        .update(patch)
        .eq("id", id);

      if (error) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? snapshot : c)).sort((a, b) => a.name.localeCompare(b.name))
        );
        toast.error(`Failed to update category: ${error.message}`);
      }
    },
    []
  );

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    const snapshot = categoriesRef.current.find((c) => c.id === id);
    if (!snapshot) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      setCategories((prev) =>
        [...prev, snapshot].sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.error(`Failed to delete category: ${error.message}`);
    }
  }, []);

  return { categories, loading, createCategory, updateCategory, deleteCategory };
}
