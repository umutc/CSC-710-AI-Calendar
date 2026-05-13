import { useCallback, useRef, useState } from "react";
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

const MAX_DISPLAY = 40; // 20 turns × 2 messages

export function useAIAssistant(onResponse?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const onResponseRef = useRef(onResponse);
  onResponseRef.current = onResponse;

  const { createEvent, updateEvent, deleteEvent } = useEvents();
  const { deleteTodo } = useTodos();

  const send = useCallback(
    async (text: string, opts?: { voice?: boolean; imageFile?: File }) => {
      const trimmed = text.trim();
      const hasImage = !!opts?.imageFile;
      if ((!trimmed && !hasImage) || loading) return;

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

      if (fnError || !data?.message) {
        setError(fnError?.message ?? "No response from assistant");
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

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationIdRef.current = null;
  }, []);

  return { messages, loading, error, send, clear };
}
