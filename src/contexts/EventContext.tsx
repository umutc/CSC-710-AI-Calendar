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
import type { Event, RRulePreset } from "../types";

export interface EventState {
  events: Event[];
  loading: boolean;
  error: string | null;
}

export type EventAction =
  | { type: "SET_EVENTS"; payload: Event[] }
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "UPDATE_EVENT"; payload: Event }
  | { type: "DELETE_EVENT"; payload: { id: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

export const initialEventState: EventState = {
  events: [],
  loading: true,
  error: null,
};

export function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case "SET_EVENTS":
      return { ...state, events: action.payload };
    case "ADD_EVENT":
      if (state.events.some((event) => event.id === action.payload.id)) {
        return state;
      }
      return { ...state, events: [...state.events, action.payload] };
    case "UPDATE_EVENT": {
      const index = state.events.findIndex((event) => event.id === action.payload.id);
      if (index === -1) return state;
      const next = state.events.slice();
      next[index] = action.payload;
      return { ...state, events: next };
    }
    case "DELETE_EVENT":
      return { ...state, events: state.events.filter((event) => event.id !== action.payload.id) };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  category_id?: string | null;
  rrule?: RRulePreset | null;
  reminder_offset_minutes?: number | null;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  category_id?: string | null;
  rrule?: RRulePreset | null;
  reminder_offset_minutes?: number | null;
}

export interface EventContextValue {
  events: Event[];
  loading: boolean;
  error: string | null;
  createEvent: (input: CreateEventInput) => Promise<string | null>;
  updateEvent: (id: string, input: UpdateEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(eventReducer, initialEventState);
  const eventsRef = useRef<Event[]>(state.events);
  eventsRef.current = state.events;

  useEffect(() => {
    if (!user?.id) {
      dispatch({ type: "SET_EVENTS", payload: [] });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    let cancelled = false;
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        toast.error(`Failed to load events: ${error.message}`);
      } else {
        dispatch({ type: "SET_EVENTS", payload: (data ?? []) as Event[] });
      }

      dispatch({ type: "SET_LOADING", payload: false });
    })();

    const channel = supabase
      .channel(`events:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            dispatch({ type: "ADD_EVENT", payload: payload.new as Event });
          } else if (payload.eventType === "UPDATE") {
            dispatch({ type: "UPDATE_EVENT", payload: payload.new as Event });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            if (old?.id) {
              dispatch({ type: "DELETE_EVENT", payload: { id: old.id } });
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

  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<string | null> => {
      if (!user?.id) {
        toast.error("Not signed in");
        return null;
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: Event = {
        id,
        user_id: user.id,
        title: input.title,
        description: input.description ?? null,
        start_at: input.start_at,
        end_at: input.end_at,
        all_day: input.all_day ?? false,
        category_id: input.category_id ?? null,
        rrule: input.rrule ?? null,
        reminder_offset_minutes: input.reminder_offset_minutes ?? null,
        created_by_ai: false,
        created_at: now,
        updated_at: now,
      };

      dispatch({ type: "ADD_EVENT", payload: optimistic });

      const { error } = await supabase.from("events").insert({
        id,
        user_id: user.id,
        title: optimistic.title,
        description: optimistic.description,
        start_at: optimistic.start_at,
        end_at: optimistic.end_at,
        all_day: optimistic.all_day,
        category_id: optimistic.category_id,
        rrule: optimistic.rrule,
        reminder_offset_minutes: optimistic.reminder_offset_minutes,
      });

      if (error) {
        dispatch({ type: "DELETE_EVENT", payload: { id } });
        toast.error(`Failed to create event: ${error.message}`);
        return null;
      }

      toast.success("Event created");
      return id;
    },
    [user?.id]
  );

  const updateEvent = useCallback(
    async (id: string, input: UpdateEventInput): Promise<void> => {
      const existing = eventsRef.current.find((e) => e.id === id);
      if (!existing) return;

      const updated: Event = { ...existing, ...input, updated_at: new Date().toISOString() };
      dispatch({ type: "UPDATE_EVENT", payload: updated });

      const { error } = await supabase
        .from("events")
        .update(input)
        .eq("id", id);

      if (error) {
        dispatch({ type: "UPDATE_EVENT", payload: existing });
        toast.error(`Failed to update event: ${error.message}`);
      }
    },
    []
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<void> => {
      const existing = eventsRef.current.find((e) => e.id === id);
      if (!existing) return;

      dispatch({ type: "DELETE_EVENT", payload: { id } });

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) {
        dispatch({ type: "ADD_EVENT", payload: existing });
        toast.error(`Failed to delete event: ${error.message}`);
      }
    },
    []
  );

  const value = useMemo<EventContextValue>(
    () => ({
      events: state.events,
      loading: state.loading,
      error: state.error,
      createEvent,
      updateEvent,
      deleteEvent,
    }),
    [state.events, state.loading, state.error, createEvent, updateEvent, deleteEvent]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}
