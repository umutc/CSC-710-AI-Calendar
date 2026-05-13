// Integration tests for the Dayforma AI Edge Function's agentic tool loop.
//
// These tests load `supabase/functions/ai-assistant/loop.ts` under Vitest
// (the Vite config aliases the Deno-style `npm:` / `jsr:` import specifiers
// it uses transitively) and drive it with a mocked Anthropic SDK plus a
// mocked Supabase client. They prove the loop:
//   1. Dispatches a tool_use block from Claude to `executeTool`, persists
//      the mutation via the (mock) Supabase client, then continues the
//      loop with the tool result and returns the final assistant text.
//   2. Terminates at MAX_ITERATIONS even if Claude keeps returning
//      `tool_use` indefinitely — preventing infinite Anthropic spend.

import { describe, expect, it, vi } from "vitest";
import {
  runAssistantLoop,
  MAX_ITERATIONS,
  type AnthropicLike,
} from "../../supabase/functions/ai-assistant/loop";

// ── Minimal SDK shims ────────────────────────────────────────────────────────
// The Edge Function imports the Anthropic SDK as `import type`, so esbuild
// erases it. Here in the test we only need enough of the shape that
// `runAssistantLoop` reads off `response` — `stop_reason`, `content[]`,
// `id`, `name`, `input`, `text`, `type`. Keeping it as `any`-typed objects
// in the helpers below avoids adding the heavyweight @anthropic-ai/sdk dev
// dep just for type definitions.

type StopReason = "tool_use" | "end_turn" | "max_tokens";

interface FakeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface FakeTextBlock {
  type: "text";
  text: string;
}

type FakeContentBlock = FakeToolUseBlock | FakeTextBlock;

interface FakeMessage {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  stop_reason: StopReason;
  stop_sequence: null;
  usage: { input_tokens: number; output_tokens: number };
  content: FakeContentBlock[];
}

function fakeToolUseResponse(blocks: FakeToolUseBlock[]): FakeMessage {
  return {
    id: "msg_tool",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50 },
    content: blocks,
  };
}

function fakeTextResponse(text: string): FakeMessage {
  return {
    id: "msg_final",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 20 },
    content: [{ type: "text", text }],
  };
}

// ── Supabase client mocks ────────────────────────────────────────────────────
// `executeTool` for `create_todo` calls
//   supabase.from("todos").insert({...}).select("id, title").single()
// and expects `{ data, error }`. Build a thenable-free fluent stub that
// returns whatever the caller wires up for `.single()`.

interface InsertReturn {
  data: { id: string; title: string } | null;
  error: { message: string } | null;
}

function makeSupabaseStub(insertReturn: InsertReturn) {
  const single = vi.fn().mockResolvedValue(insertReturn);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  return {
    client: { from } as unknown as Parameters<typeof runAssistantLoop>[0]["supabase"],
    spies: { from, insert, select, single },
  };
}

describe("runAssistantLoop", () => {
  it("dispatches a create_todo tool_use, persists via supabase, then returns the final text", async () => {
    const supabaseInsertReturn: InsertReturn = {
      data: { id: "todo-uuid-123", title: "Buy milk" },
      error: null,
    };
    const { client: supabase, spies } = makeSupabaseStub(supabaseInsertReturn);

    // Claude script: first call → tool_use(create_todo); second call → text.
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        fakeToolUseResponse([
          {
            type: "tool_use",
            id: "toolu_01",
            name: "create_todo",
            input: { title: "Buy milk" },
          },
        ])
      )
      .mockResolvedValueOnce(fakeTextResponse("Created the todo."));

    const anthropic: AnthropicLike = { messages: { create } as never };

    const result = await runAssistantLoop({
      anthropic,
      supabase,
      userId: "user-123",
      systemBlocks: [{ type: "text", text: "sys" }],
      history: [],
      userMessage: { role: "user", content: "Add buy milk to my todos." },
      tools: [],
    });

    // 1. Loop called Claude twice (once for the tool_use, once for the
    //    follow-up after the tool result was fed back in).
    expect(create).toHaveBeenCalledTimes(2);

    // 2. The first Anthropic call's `messages` had just the user message.
    const firstCallArgs = create.mock.calls[0][0];
    expect(firstCallArgs.messages).toEqual([
      { role: "user", content: "Add buy milk to my todos." },
    ]);

    // 3. The second call's `messages` had the user message, the assistant
    //    tool_use turn, then a user `tool_result` block tied to toolu_01.
    const secondCallArgs = create.mock.calls[1][0];
    expect(secondCallArgs.messages).toHaveLength(3);
    expect(secondCallArgs.messages[1].role).toBe("assistant");
    expect(secondCallArgs.messages[2].role).toBe("user");
    expect(secondCallArgs.messages[2].content[0]).toMatchObject({
      type: "tool_result",
      tool_use_id: "toolu_01",
    });

    // 4. Supabase received exactly one insert into "todos" for our user with
    //    the AI flag set.
    expect(spies.from).toHaveBeenCalledWith("todos");
    expect(spies.insert).toHaveBeenCalledTimes(1);
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        title: "Buy milk",
        created_by_ai: true,
        status: "pending",
      })
    );

    // 5. Loop reported the mutation it persisted.
    expect(result.mutations).toEqual([
      { type: "create_todo", id: "todo-uuid-123", snapshot: null },
    ]);

    // 6. Loop returned the assistant's final text.
    expect(result.assistantText).toBe("Created the todo.");
    expect(result.iterations).toBe(2);
  });

  it("terminates at MAX_ITERATIONS even when Claude keeps returning tool_use", async () => {
    const { client: supabase, spies } = makeSupabaseStub({
      data: { id: "todo-uuid-runaway", title: "loop" },
      error: null,
    });

    // Claude misbehaves: returns tool_use on every call. Provide more
    // mocked responses than MAX_ITERATIONS so we can detect if the loop
    // ever exceeds the cap.
    const runaway = fakeToolUseResponse([
      {
        type: "tool_use",
        id: "toolu_runaway",
        name: "create_todo",
        input: { title: "loop" },
      },
    ]);
    const create = vi
      .fn()
      .mockResolvedValueOnce(runaway)
      .mockResolvedValueOnce(runaway)
      .mockResolvedValueOnce(runaway)
      .mockResolvedValueOnce(runaway)
      .mockResolvedValueOnce(runaway)
      .mockResolvedValueOnce(runaway); // 6th would only fire if cap broke

    const anthropic: AnthropicLike = { messages: { create } as never };

    const result = await runAssistantLoop({
      anthropic,
      supabase,
      userId: "user-runaway",
      systemBlocks: [],
      history: [],
      userMessage: { role: "user", content: "loop forever" },
      tools: [],
    });

    // 1. Claude was called exactly MAX_ITERATIONS times — no more.
    expect(create).toHaveBeenCalledTimes(MAX_ITERATIONS);
    // 2. Sanity check: the cap is 5 per the production constant.
    expect(MAX_ITERATIONS).toBe(5);

    // 3. Every iteration triggered a supabase insert, so the loop kept
    //    dispatching tool calls right up to the cap.
    expect(spies.insert).toHaveBeenCalledTimes(MAX_ITERATIONS);

    // 4. No final text was produced (the loop never saw `end_turn`).
    expect(result.assistantText).toBe("");

    // 5. Each iteration persisted a mutation.
    expect(result.mutations).toHaveLength(MAX_ITERATIONS);
    expect(result.mutations.every((m) => m.type === "create_todo")).toBe(true);

    expect(result.iterations).toBe(MAX_ITERATIONS);
  });
});
