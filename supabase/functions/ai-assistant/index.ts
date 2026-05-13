// Dayforma AI Assistant — Supabase Edge Function
// Runtime: Deno (Supabase Edge)
// Model: claude-sonnet-4-6

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";
import { createClient } from "jsr:@supabase/supabase-js@^2.57.4";
import { TOOLS } from "./tools.ts";
import { executeTool } from "./toolHandlers.ts";
import type { MutationRecord } from "./toolHandlers.ts";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const MAX_STORED_MESSAGES = 50;

const SYSTEM_PROMPT = `You are Dayforma, a calendar and todo assistant. You help the user plan
their day by creating, updating, and deleting events and todos on their behalf.

Rules:
- Act directly when the user is unambiguous ("dentist tomorrow at 3" → create the event).
- Ask a short clarifying question when the input is ambiguous.
- When scheduling, avoid collisions with existing events unless the user asks to overlap.
- Prefer the user's working hours (9:00–18:00 local) unless told otherwise.
- Always respond in English.

Image input:
- The user may attach an image — typically a photo or scan of a handwritten note.
- Read the visible text first (best-effort OCR), then translate each item into the
  appropriate tool call: a dated/timed item becomes an event; an undated task
  becomes a todo. Infer priority/category when obvious.
- For ambiguous bullets, prefer create_todo over create_event.
- After acting, briefly summarise in English what you extracted from the image.`;

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
};

interface AssistantRequest {
  conversation_id?: string;
  message: string;
  image_url?: string | null;
  timezone?: string;
  voice?: boolean;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!supabaseUrl || !supabaseAnon || !anthropicKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  // ── 1. Verify JWT ────────────────────────────────────────────────────────────
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as AssistantRequest;
  if (!body.message?.trim() && !body.image_url) {
    return new Response("message or image_url is required", { status: 400 });
  }

  // ── 2. Load conversation history ─────────────────────────────────────────────
  let conversationId: string | null = body.conversation_id ?? null;
  let history: StoredMessage[] = [];

  if (conversationId) {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("messages")
      .eq("id", conversationId)
      .single();
    if (conv?.messages) {
      history = conv.messages as StoredMessage[];
    }
  }

  // ── 3. Call Claude — agentic loop (max 5 iterations) ────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const tz = body.timezone ?? "UTC";
  const nowDate = new Date();

  // Compute UTC offset for the user's timezone (accounts for DST)
  const localMs = new Date(nowDate.toLocaleString("en-US", { timeZone: tz })).getTime();
  const utcMs = new Date(nowDate.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const diffMins = Math.round((localMs - utcMs) / 60000);
  const sign = diffMins >= 0 ? "+" : "-";
  const absMins = Math.abs(diffMins);
  const tzOffset = `${sign}${String(Math.floor(absMins / 60)).padStart(2, "0")}:${String(absMins % 60).padStart(2, "0")}`;

  const nowLocal = nowDate.toLocaleString("en-US", { timeZone: tz, hour12: false });

  const systemBlocks = [
    {
      type: "text" as const,
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: `Current date/time: ${nowLocal} (${tz}, UTC${tzOffset}). Use this as the reference for all relative dates like "today", "tomorrow", "next Monday". IMPORTANT: always include the UTC offset in every datetime string you produce, e.g. "2026-05-14T15:00:00${tzOffset}". Never emit a bare datetime without an offset.`,
    },
  ];

  type MessageParam = Anthropic.MessageParam;

  // Build the user message — vision content block when an image is attached.
  const userMessage: MessageParam = body.image_url
    ? {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: body.image_url },
          },
          {
            type: "text",
            text: body.message?.trim() || "Read this handwritten note and create relevant todos or events.",
          },
        ],
      }
    : { role: "user", content: body.message };

  let messages: MessageParam[] = [...history, userMessage];

  let assistantText = "";
  const MAX_ITERATIONS = 5;
  const mutations: MutationRecord[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemBlocks,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      messages = [...messages, { role: "assistant", content: response.content }];

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block: Anthropic.ToolUseBlock) => {
          const result = await executeTool(block, supabase, userData.user.id);
          if (result.mutation) mutations.push(result.mutation as MutationRecord);
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        })
      );

      messages = [...messages, { role: "user", content: toolResults }];
      continue;
    }

    // end_turn or max_tokens — extract final text and stop
    assistantText = response.content
      .filter((b: Anthropic.ContentBlock): b is Anthropic.TextBlock => b.type === "text")
      .map((b: Anthropic.TextBlock) => b.text)
      .join("\n");
    break;
  }

  // ── 4. Persist updated conversation (trimmed to last 50 messages) ─────────────
  // Store only text in history; image references stay one-shot per turn.
  const userHistoryText = body.image_url
    ? `[image attached] ${body.message?.trim() ?? ""}`.trim()
    : body.message;

  const updatedMessages: StoredMessage[] = [
    ...history,
    { role: "user" as const, content: userHistoryText },
    { role: "assistant" as const, content: assistantText },
  ].slice(-MAX_STORED_MESSAGES);

  if (conversationId) {
    await supabase
      .from("ai_conversations")
      .update({ messages: updatedMessages })
      .eq("id", conversationId);
  } else {
    const { data: newConv } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userData.user.id,
        title: body.message.slice(0, 80),
        messages: updatedMessages,
      })
      .select("id")
      .single();
    conversationId = newConv?.id ?? null;
  }

  // ── 5. Return response ────────────────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      conversation_id: conversationId,
      message: assistantText,
      stop_reason: "end_turn",
      mutations,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
});
