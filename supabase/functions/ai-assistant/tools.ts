// Tool definitions for the Dayforma AI assistant.
//
// Each tool has two representations kept in sync side-by-side:
//   1. A Zod schema — used to validate the input Claude returns before
//      touching the database.
//   2. A JSON Schema (input_schema) — passed to the Claude API so the
//      model knows what parameters each tool accepts.

import { z } from "npm:zod@^3";
import type Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const CreateEventSchema = z.object({
  title: z.string().min(1),
  start_at: z.string(),
  end_at: z.string(),
  all_day: z.boolean().optional(),
  description: z.string().optional(),
  category_name: z.string().optional(),
});

export const UpdateEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  all_day: z.boolean().optional(),
  description: z.string().optional(),
});

export const DeleteEventSchema = z.object({
  id: z.string().uuid(),
});

export const CreateTodoSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_at: z.string().optional(),
  description: z.string().optional(),
});

export const FindFreeTimeSchema = z.object({
  date: z.string(),
  duration_minutes: z.number().int().positive(),
  after_time: z.string().optional(),
  before_time: z.string().optional(),
});

export const ListEventsSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

export const SummarizeWeekSchema = z.object({
  week_start: z.string(),
});

// ── Inferred TypeScript types ─────────────────────────────────────────────────

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type DeleteEventInput = z.infer<typeof DeleteEventSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
export type FindFreeTimeInput = z.infer<typeof FindFreeTimeSchema>;
export type ListEventsInput = z.infer<typeof ListEventsSchema>;
export type SummarizeWeekInput = z.infer<typeof SummarizeWeekSchema>;

// ── Claude tool definitions (JSON Schema mirrors) ─────────────────────────────

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_event",
    description: "Create a calendar event for the user.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Event title" },
        start_at: { type: "string", description: "Start time in ISO 8601 format e.g. 2026-05-06T09:00:00" },
        end_at: { type: "string", description: "End time in ISO 8601 format e.g. 2026-05-06T10:00:00" },
        all_day: { type: "boolean", description: "True for all-day events; omit start/end times if set" },
        description: { type: "string", description: "Optional notes about the event" },
        category_name: { type: "string", description: "Category name e.g. Work, Personal, Health" },
      },
      required: ["title", "start_at", "end_at"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing calendar event. Only include fields that need to change.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "UUID of the event to update" },
        title: { type: "string" },
        start_at: { type: "string", description: "New start time in ISO 8601 format" },
        end_at: { type: "string", description: "New end time in ISO 8601 format" },
        all_day: { type: "boolean" },
        description: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_event",
    description: "Permanently delete a calendar event.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "UUID of the event to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_todo",
    description: "Create a new todo task for the user.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority; default medium",
        },
        due_at: { type: "string", description: "Due date in YYYY-MM-DD format" },
        description: { type: "string", description: "Optional details about the task" },
      },
      required: ["title"],
    },
  },
  {
    name: "find_free_time",
    description: "Find open time slots in the user's calendar on a given day.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date to search in YYYY-MM-DD format" },
        duration_minutes: { type: "number", description: "Required slot length in minutes" },
        after_time: { type: "string", description: "Earliest acceptable start in HH:MM format (default 09:00)" },
        before_time: { type: "string", description: "Latest acceptable end in HH:MM format (default 18:00)" },
      },
      required: ["date", "duration_minutes"],
    },
  },
  {
    name: "list_events",
    description: "List the user's calendar events within a date range.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "Range start in YYYY-MM-DD format" },
        end_date: { type: "string", description: "Range end in YYYY-MM-DD format" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "summarize_week",
    description: "Summarize the user's events and todos for a given week.",
    input_schema: {
      type: "object" as const,
      properties: {
        week_start: { type: "string", description: "Monday of the week to summarize in YYYY-MM-DD format" },
      },
      required: ["week_start"],
    },
  },
];
