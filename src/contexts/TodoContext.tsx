import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { Priority, Todo, TodoStatus } from "../types";

// ─── State + Actions ───────────────────────────────────────────────────────
export interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
}

export type TodoAction =
  | { type: "SET_TODOS"; payload: Todo[] }
  | { type: "ADD_TODO"; payload: Todo }
  | { type: "UPDATE_TODO"; payload: Todo }
  | { type: "DELETE_TODO"; payload: { id: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

export const initialTodoState: TodoState = {
  todos: [],
  loading: true,
  error: null,
};

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "SET_TODOS":
      return { ...state, todos: action.payload };
    case "ADD_TODO": {
      if (state.todos.some((t) => t.id === action.payload.id)) {
        return state;
      }
      return { ...state, todos: [...state.todos, action.payload] };
    }
    case "UPDATE_TODO": {
      const idx = state.todos.findIndex((t) => t.id === action.payload.id);
      if (idx === -1) return state;
      const next = state.todos.slice();
      next[idx] = action.payload;
      return { ...state, todos: next };
    }
    case "DELETE_TODO": {
      const filtered = state.todos.filter(
        (t) => t.id !== action.payload.id
      );
      if (filtered.length === state.todos.length) return state;
      return { ...state, todos: filtered };
    }
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// ─── Context value shape ──────────────────────────────────────────────────
export interface CreateTodoInput {
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: Priority;
  category_id?: string | null;
  status?: TodoStatus;
  linked_event_id?: string | null;
}

export interface TodoContextValue {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  createTodo: (input: CreateTodoInput) => Promise<string>;
  updateTodo: (id: string, patch: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
}

export const TodoContext = createContext<TodoContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────
export function TodoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(todoReducer, initialTodoState);

  // Latest todos snapshot for rollback paths in async callbacks.
  const todosRef = useRef<Todo[]>(state.todos);
  todosRef.current = state.todos;

  // Bootstrap fetch + realtime subscription, scoped to the signed-in user.
  useEffect(() => {
    if (!user?.id) {
      dispatch({ type: "SET_TODOS", payload: [] });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    let cancelled = false;
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    (async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (cancelled) return;

      if (error) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        toast.error(`Failed to load todos: ${error.message}`);
      } else {
        dispatch({ type: "SET_TODOS", payload: (data ?? []) as Todo[] });
      }
      dispatch({ type: "SET_LOADING", payload: false });
    })();

    const channel = supabase
      .channel(`todos:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            dispatch({ type: "ADD_TODO", payload: payload.new as Todo });
          } else if (payload.eventType === "UPDATE") {
            dispatch({ type: "UPDATE_TODO", payload: payload.new as Todo });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            if (old?.id) {
              dispatch({ type: "DELETE_TODO", payload: { id: old.id } });
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

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const createTodo = useCallback(
    async (input: CreateTodoInput): Promise<string> => {
      if (!user?.id) {
        toast.error("Not signed in");
        return "";
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: Todo = {
        id,
        user_id: user.id,
        title: input.title,
        description: input.description ?? null,
        due_at: input.due_at ?? null,
        priority: input.priority ?? "medium",
        category_id: input.category_id ?? null,
        status: input.status ?? "pending",
        linked_event_id: input.linked_event_id ?? null,
        created_by_ai: false,
        created_at: now,
        updated_at: now,
      };
      dispatch({ type: "ADD_TODO", payload: optimistic });

      const { error } = await supabase.from("todos").insert({
        id,
        user_id: user.id,
        title: optimistic.title,
        description: optimistic.description,
        due_at: optimistic.due_at,
        priority: optimistic.priority,
        category_id: optimistic.category_id,
        status: optimistic.status,
        linked_event_id: optimistic.linked_event_id,
      });

      if (error) {
        dispatch({ type: "DELETE_TODO", payload: { id } });
        toast.error(`Failed to create todo: ${error.message}`);
      }
      return id;
    },
    [user?.id]
  );

  const updateTodo = useCallback(
    async (id: string, patch: Partial<Todo>) => {
      const snapshot = todosRef.current.find((t) => t.id === id);
      if (!snapshot) {
        toast.error("Todo not found");
        return;
      }
      const optimistic: Todo = {
        ...snapshot,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      dispatch({ type: "UPDATE_TODO", payload: optimistic });

      const { error } = await supabase
        .from("todos")
        .update(patch)
        .eq("id", id);

      if (error) {
        dispatch({ type: "UPDATE_TODO", payload: snapshot });
        toast.error(`Failed to update todo: ${error.message}`);
      }
    },
    []
  );

  const deleteTodo = useCallback(async (id: string) => {
    const snapshot = todosRef.current.find((t) => t.id === id);
    if (!snapshot) {
      toast.error("Todo not found");
      return;
    }
    dispatch({ type: "DELETE_TODO", payload: { id } });

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      dispatch({ type: "ADD_TODO", payload: snapshot });
      toast.error(`Failed to delete todo: ${error.message}`);
    }
  }, []);

  const toggleStatus = useCallback(
    async (id: string) => {
      const snapshot = todosRef.current.find((t) => t.id === id);
      if (!snapshot) return;
      if (snapshot.status === "scheduled") return;
      const next: TodoStatus = snapshot.status === "done" ? "pending" : "done";
      await updateTodo(id, { status: next });
    },
    [updateTodo]
  );

  const value = useMemo<TodoContextValue>(
    () => ({
      todos: state.todos,
      loading: state.loading,
      error: state.error,
      createTodo,
      updateTodo,
      deleteTodo,
      toggleStatus,
    }),
    [
      state.todos,
      state.loading,
      state.error,
      createTodo,
      updateTodo,
      deleteTodo,
      toggleStatus,
    ]
  );

  return (
    <TodoContext.Provider value={value}>{children}</TodoContext.Provider>
  );
}
