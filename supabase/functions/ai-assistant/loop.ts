// Agentic tool-use loop for the Dayforma AI assistant.
//
// Extracted from `index.ts` so that it can be tested under Vitest with a
// mocked Anthropic SDK + mocked Supabase client. The serve() handler in
// `index.ts` constructs the real clients and forwards them in; the
// integration tests in `tests/integration/` pass mocks instead.
//
// Pure function, no Deno-only runtime imports here. The Anthropic / Supabase
// SDK imports are TYPE-ONLY so esbuild erases them entirely and Vitest does
// not have to resolve the `npm:` / `jsr:` specifiers.

import type Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@^2.57.4";
import { executeTool } from "./toolHandlers.ts";
import type { MutationRecord } from "./toolHandlers.ts";

export const CLAUDE_MODEL = "claude-sonnet-4-6";
export const MAX_ITERATIONS = 5;

type MessageParam = Anthropic.MessageParam;

/**
 * Minimal interface for the part of the Anthropic SDK the loop touches.
 * Lets tests inject a mock without depending on the real SDK shape.
 */
export interface AnthropicLike {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system: unknown;
      tools: unknown;
      messages: MessageParam[];
    }): Promise<Anthropic.Message>;
  };
}

export interface RunAssistantLoopArgs {
  anthropic: AnthropicLike;
  supabase: SupabaseClient;
  userId: string;
  systemBlocks: unknown;
  history: MessageParam[];
  userMessage: MessageParam;
  tools: Anthropic.Tool[];
}

export interface RunAssistantLoopResult {
  assistantText: string;
  mutations: MutationRecord[];
  iterations: number;
}

/**
 * Drives Claude's agentic tool-use loop. Sends the user message, dispatches
 * any `tool_use` blocks via `executeTool`, feeds the results back, and
 * repeats up to `MAX_ITERATIONS` times. Returns the final assistant text and
 * the list of database mutations performed by tools.
 *
 * The loop is identical to the original inlined body in `index.ts`; the
 * extraction is behaviour-preserving.
 */
export async function runAssistantLoop({
  anthropic,
  supabase,
  userId,
  systemBlocks,
  history,
  userMessage,
  tools,
}: RunAssistantLoopArgs): Promise<RunAssistantLoopResult> {
  let messages: MessageParam[] = [...history, userMessage];
  let assistantText = "";
  const mutations: MutationRecord[] = [];
  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1;
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemBlocks,
      tools,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      messages = [...messages, { role: "assistant", content: response.content }];

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block: Anthropic.ToolUseBlock) => {
          const result = await executeTool(block, supabase, userId);
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

  return { assistantText, mutations, iterations };
}
