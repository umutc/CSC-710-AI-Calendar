import { useCallback, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIResponse {
  conversation_id: string;
  message: string;
  stop_reason: string;
}

const MAX_DISPLAY = 40; // 20 turns × 2 messages

export function useAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke<AIResponse>(
        "ai-assistant",
        {
          body: {
            conversation_id: conversationIdRef.current ?? undefined,
            message: trimmed,
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

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, assistantMsg].slice(-MAX_DISPLAY));
    },
    [loading]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationIdRef.current = null;
  }, []);

  return { messages, loading, error, send, clear };
}
