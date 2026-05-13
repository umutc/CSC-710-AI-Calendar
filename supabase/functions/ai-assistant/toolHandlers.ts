// Tool execution handlers for the Dayforma AI assistant.
// Each handler validates input via Zod, runs a DB operation, and returns a
// plain object that gets serialised into a tool_result message for Claude.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@^2.57.4";
import type Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";
import {
  CreateEventSchema,
  CreateTodoSchema,
  DeleteEventSchema,
  FindFreeTimeSchema,
  ListEventsSchema,
  SummarizeWeekSchema,
  UpdateEventSchema,
} from "./tools.ts";

type ToolUseBlock = Anthropic.ToolUseBlock;

export async function executeTool(
  block: ToolUseBlock,
  supabase: SupabaseClient,
  userId: string
): Promise<unknown> {
  switch (block.name) {
    case "create_event": {
      const input = CreateEventSchema.parse(block.input);

      let categoryId: string | null = null;
      if (input.category_name) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", userId)
          .ilike("name", input.category_name)
          .maybeSingle();
        categoryId = cat?.id ?? null;
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          user_id: userId,
          title: input.title,
          start_at: input.start_at,
          end_at: input.end_at,
          all_day: input.all_day ?? false,
          description: input.description ?? null,
          category_id: categoryId,
          created_by_ai: true,
        })
        .select("id, title, start_at, end_at")
        .single();

      if (error) return { error: error.message };
      return { success: true, event: data };
    }

    case "update_event": {
      const input = UpdateEventSchema.parse(block.input);
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.start_at !== undefined) updates.start_at = input.start_at;
      if (input.end_at !== undefined) updates.end_at = input.end_at;
      if (input.all_day !== undefined) updates.all_day = input.all_day;
      if (input.description !== undefined) updates.description = input.description;

      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", input.id)
        .eq("user_id", userId);

      if (error) return { error: error.message };
      return { success: true };
    }

    case "delete_event": {
      const input = DeleteEventSchema.parse(block.input);
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", input.id)
        .eq("user_id", userId);

      if (error) return { error: error.message };
      return { success: true };
    }

    case "create_todo": {
      const input = CreateTodoSchema.parse(block.input);
      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: userId,
          title: input.title,
          priority: input.priority ?? "medium",
          due_at: input.due_at ?? null,
          description: input.description ?? null,
          status: "pending",
          created_by_ai: true,
        })
        .select("id, title")
        .single();

      if (error) return { error: error.message };
      return { success: true, todo: data };
    }

    case "find_free_time": {
      const input = FindFreeTimeSchema.parse(block.input);
      const afterTime = input.after_time ?? "09:00";
      const beforeTime = input.before_time ?? "18:00";
      const dayStart = `${input.date}T${afterTime}:00`;
      const dayEnd = `${input.date}T${beforeTime}:00`;

      const { data: events } = await supabase
        .from("events")
        .select("start_at, end_at, title")
        .eq("user_id", userId)
        .gte("start_at", dayStart)
        .lt("end_at", dayEnd)
        .order("start_at");

      const durationMs = input.duration_minutes * 60 * 1000;
      const slots: Array<{ start: string; end: string }> = [];
      let cursor = new Date(dayStart);
      const workEnd = new Date(dayEnd);

      for (const ev of events ?? []) {
        const evStart = new Date(ev.start_at);
        if (evStart.getTime() - cursor.getTime() >= durationMs) {
          slots.push({
            start: cursor.toISOString(),
            end: new Date(cursor.getTime() + durationMs).toISOString(),
          });
        }
        const evEnd = new Date(ev.end_at);
        if (evEnd > cursor) cursor = evEnd;
      }

      if (workEnd.getTime() - cursor.getTime() >= durationMs) {
        slots.push({
          start: cursor.toISOString(),
          end: new Date(cursor.getTime() + durationMs).toISOString(),
        });
      }

      return { date: input.date, duration_minutes: input.duration_minutes, free_slots: slots };
    }

    case "list_events": {
      const input = ListEventsSchema.parse(block.input);
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, all_day, description")
        .eq("user_id", userId)
        .gte("start_at", `${input.start_date}T00:00:00`)
        .lte("start_at", `${input.end_date}T23:59:59`)
        .order("start_at");

      if (error) return { error: error.message };
      return { events: data ?? [] };
    }

    case "summarize_week": {
      const input = SummarizeWeekSchema.parse(block.input);
      const weekStart = new Date(`${input.week_start}T00:00:00`);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [{ data: events }, { data: todos }] = await Promise.all([
        supabase
          .from("events")
          .select("title, start_at, end_at, all_day")
          .eq("user_id", userId)
          .gte("start_at", weekStart.toISOString())
          .lt("start_at", weekEnd.toISOString())
          .order("start_at"),
        supabase
          .from("todos")
          .select("title, priority, status, due_at")
          .eq("user_id", userId)
          .in("status", ["pending", "scheduled"]),
      ]);

      return { week_start: input.week_start, events: events ?? [], todos: todos ?? [] };
    }

    default:
      return { error: `Unknown tool: ${block.name}` };
  }
}
