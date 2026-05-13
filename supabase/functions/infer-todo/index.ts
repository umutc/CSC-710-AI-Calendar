// Dayforma — infer-todo Edge Function
// Classifies a todo title into priority + category using a single Claude call.
// Runtime: Deno (Supabase Edge)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";
import { createClient } from "jsr:@supabase/supabase-js@^2.57.4";

const CLAUDE_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT =
  `You are a todo classifier. Return ONLY a JSON object — no explanation, no markdown:
{"priority":"low|medium|high|urgent","category_id":"<id or null>"}

Priority rules:
- urgent: production issues, hard deadlines, critical bugs
- high: important work tasks, significant personal obligations
- medium: normal everyday tasks
- low: nice-to-have, minor items

Category rules: match the category whose name best fits the todo. Examples:
- gym, workout, run, yoga, doctor, dentist, sleep, medicine → Health
- meeting, report, code, bug, deploy, email, client, project, deadline → Work
- call mom, birthday, groceries, family, friend, dinner, hobbies → Personal
If none of the available categories fit well, return null for category_id.
Always pick from the provided category ids — never invent one.`;

const FALLBACK = { priority: "medium", category_id: null };

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { title } = (await req.json()) as { title?: string };
  if (!title?.trim()) {
    return new Response("title is required", { status: 400 });
  }

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userData.user.id);

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 64,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Title: "${title.trim()}"\nCategories: ${JSON.stringify(cats ?? [])}`,
      },
    ],
  });

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let result = FALLBACK;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      result = {
        priority: ["low", "medium", "high", "urgent"].includes(parsed.priority)
          ? parsed.priority
          : "medium",
        category_id: typeof parsed.category_id === "string" ? parsed.category_id : null,
      };
    }
  } catch {
    // malformed JSON → use fallback
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
});
