import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { applyWithUndo } from "../lib/applyWithUndo";
import { uploadTodoImage } from "../lib/imageUpload";
import type { MutationRecord } from "../lib/applyWithUndo";
import { useEvents } from "./useEvents";
import { useTodos } from "./useTodos";
import type { CreateEventInput, UpdateEventInput } from "../contexts/EventContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIResponse {
  conversation_id: string;
  message: string;
  stop_reason: string;
  mutations?: MutationRecord[];
}

interface QueuedSend {
  text: string;
  voice: boolean;
}

const MAX_DISPLAY = 40; // 20 turns × 2 messages

export function useAIAssistant(onResponse?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const onResponseRef = useRef(onResponse);
  onResponseRef.current = onResponse;

  // In-memory queue of pending sends while offline. We keep only the most recent
  // queued message — this is intentionally lightweight (no persistence across
  // reloads, no IndexedDB).
  const offlineQueueRef = useRef<QueuedSend | null>(null);
  const sendRef = useRef<((text: string, opts?: { voice?: boolean; imageFile?: File }) => Promise<void>) | null>(null);

  const { createEvent, updateEvent, deleteEvent } = useEvents();
  const { deleteTodo } = useTodos();

  const send = useCallback(
    async (text: string, opts?: { voice?: boolean; imageFile?: File }) => {
      const trimmed = text.trim();
      const hasImage = !!opts?.imageFile;
      if ((!trimmed && !hasImage) || loading) return;

      // Offline guard — queue the (text-only) message and bail out. Image attachments
      // are intentionally not queued; the user can re-attach when back online.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (trimmed) {
          offlineQueueRef.current = { text: trimmed, voice: opts?.voice ?? false };
        }
        toast.error("You're offline — message queued.");
        return;
      }

      let imageUrl: string | null = null;
      if (hasImage) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (!uid) {
          setError("Not signed in");
          return;
        }
        setLoading(true);
        imageUrl = await uploadTodoImage(opts!.imageFile!, uid);
        setLoading(false);
        if (!imageUrl) return; // upload failed; toast already shown
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed || "📎 (attached image)",
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke<AIResponse>(
        "ai-assistant",
        {
          body: {
            conversation_id: conversationIdRef.current ?? undefined,
            message: trimmed || "Read this handwritten note and create relevant todos or events.",
            image_url: imageUrl,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            voice: opts?.voice ?? false,
          },
        }
      );

      setLoading(false);

      if (fnError) {
        // Rate limit: surface a clean toast and let the user retry manually.
        const status =
          fnError instanceof FunctionsHttpError
            ? (fnError.context as Response | undefined)?.status
            : (fnError as { status?: number } | null)?.status;
        if (status === 429) {
          toast.error("AI is busy, try again in a moment.");
        } else {
          toast.error("Couldn't reach the assistant. Try again.");
        }
        setError(fnError.message ?? "Request failed");
        return;
      }

      if (!data?.message) {
        toast.error("Couldn't reach the assistant. Try again.");
        setError("No response from assistant");
        return;
      }

      if (data.conversation_id) {
        conversationIdRef.current = data.conversation_id;
      }

      for (const mut of data.mutations ?? []) {
        if (mut.type === "create_event") {
          applyWithUndo("Event created", () => deleteEvent(mut.id));
        } else if (mut.type === "update_event") {
          applyWithUndo("Event updated", () => updateEvent(mut.id, mut.snapshot as UpdateEventInput));
        } else if (mut.type === "delete_event") {
          applyWithUndo("Event deleted", async () => { await createEvent(mut.snapshot as unknown as CreateEventInput); });
        } else if (mut.type === "create_todo") {
          applyWithUndo("Todo created", () => deleteTodo(mut.id));
        }
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, assistantMsg].slice(-MAX_DISPLAY));
      onResponseRef.current?.();

      if (opts?.voice) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.message));
      }
    },
    [loading, createEvent, updateEvent, deleteEvent, deleteTodo]
  );

  // Keep a stable ref to the latest `send` so the `online` listener never
  // captures a stale closure.
  sendRef.current = send;

  // When the browser comes back online and we have a queued message, replay
  // it automatically and clear the queue.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      const queued = offlineQueueRef.current;
      if (!queued) return;
      offlineQueueRef.current = null;
      void sendRef.current?.(queued.text, { voice: queued.voice });
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationIdRef.current = null;
  }, []);

  return { messages, loading, error, send, clear };
}
