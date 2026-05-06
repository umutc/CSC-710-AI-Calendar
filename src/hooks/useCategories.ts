import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Category } from "../types";

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
}

export function useCategories(): UseCategoriesResult {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { categories, loading };
}
