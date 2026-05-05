// Dayforma AI Assistant — Supabase Edge Function
// Runtime: Deno (Supabase Edge)
// Model: claude-sonnet-4-6

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";
import { createClient } from "jsr:@supabase/supabase-js@^2.57.4";

const CLAUDE_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Dayforma, a calendar and todo assistant. You help the user plan
their day by creating, updating, and deleting events and todos on their behalf.

Rules:
- Act directly when the user is unambiguous ("dentist tomorrow at 3" → create the event).
- Ask a short clarifying question when the input is ambiguous.
- When scheduling, avoid collisions with existing events unless the user asks to overlap.
- Prefer the user's working hours (9:00–18:00 local) unless told otherwise.
- Always respond in English.`;

const TOOLS: Anthropic.Tool[] = [
  // Full tool schemas land in the next task (define tool schemas).
  {
    name: "create_event",
    description: "Create a calendar event on the user's calendar.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        start_at: { type: "string", format: "date-time" },
        end_at: { type: "string", format: "date-time" },
        all_day: { type: "boolean" },
        category_name: { type: "string" },
      },
      required: ["title", "start_at", "end_at"],
    },
  },
];

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
};

interface AssistantRequest {
  conversation_id?: string;
  message: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
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
  if (!body.message?.trim()) {
    return new Response("message is required", { status: 400 });
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

  // ── 3. Call Claude with cached system prompt + conversation history ───────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const claudeResponse = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: TOOLS,
    messages: [
      ...history,
      { role: "user", content: body.message },
    ],
  });

  // Extract text from response (tool execution loop added in next task)
  const assistantText = claudeResponse.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // ── 4. Persist updated conversation ──────────────────────────────────────────
  const updatedMessages: StoredMessage[] = [
    ...history,
    { role: "user", content: body.message },
    { role: "assistant", content: assistantText },
  ];

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
      stop_reason: claudeResponse.stop_reason,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    }
  );
});
