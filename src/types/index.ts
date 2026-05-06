// ─── Utility Types ──────────────────────────────────────────────────────────
export type UUID = string;

// ─── Profile ────────────────────────────────────────────────────────────────
export interface Profile {
  id: UUID;
  display_name: string;
  email: string;
  avatar_url: string | null;
  timezone: string;
  theme_preference: "light" | "dark" | "system";
  created_at: string;
  last_seen: string;
}

// ─── Category ───────────────────────────────────────────────────────────────
export interface Category {
  id: UUID;
  user_id: UUID;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

// ─── Todo ───────────────────────────────────────────────────────────────────
export type Priority = "low" | "medium" | "high" | "urgent";
export type TodoStatus = "pending" | "scheduled" | "done";

export interface Todo {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: Priority;
  category_id: UUID | null;
  status: TodoStatus;
  linked_event_id: UUID | null;
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Event ──────────────────────────────────────────────────────────────────
export type RRulePreset =
  | { preset: "daily" }
  | { preset: "weekly"; weekdays: number[] }
  | { preset: "biweekly"; weekdays: number[] }
  | { preset: "monthly"; day_of_month: number }
  | { preset: "weekday" };

export interface Event {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  category_id: UUID | null;
  rrule: RRulePreset | null;
  reminder_offset_minutes: number | null;
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

// ─── AI ─────────────────────────────────────────────────────────────────────
export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface AIConversationMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
  tool_result?: unknown;
}

export interface AIConversation {
  id: UUID;
  user_id: UUID;
  title: string | null;
  messages: AIConversationMessage[];
  created_at: string;
  updated_at: string;
}
