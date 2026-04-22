// Dayforma AI Assistant — Supabase Edge Function
// Runtime: Deno (Supabase Edge)
// Model: claude-sonnet-4-6
//
// Responsibilities (expanded in Sprint 2):
//   1. Verify the caller's Supabase JWT
//   2. Load conversation history from ai_conversations
//   3. Call Claude with cached system prompt + tool definitions
//   4. Execute tool calls against the user's data (with RLS on the user's session)
//   5. Persist the updated conversation and return the response
//
// This file is a scaffold. Sprint 2 issue #22 fleshes out the full tool-use loop.

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

const TOOLS = [
  // Full tool schemas land in Sprint 2 issue #23.
  {
    name: "create_event",
    description: "Create a calendar event on the user's calendar.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start_at: { type: "string", format: "date-time" },
        end_at: { type: "string", format: "date-time" },
        all_day: { type: "boolean" },
        category_name: { type: "string" }
      },
      required: ["title", "start_at", "end_at"]
    }
  }
];

interface AssistantRequest {
  conversation_id?: string;
  message: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
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
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as AssistantRequest;

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }
      }
    ],
    tools: TOOLS,
    messages: [{ role: "user", content: body.message }]
  });

  // TODO (Sprint 2 issue #22+): loop on tool_use blocks, execute DB mutations,
  // persist to ai_conversations, return the final assistant message.

  return new Response(JSON.stringify({ ok: true, response }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
});
