import type { Priority } from "../types";

const URGENT = /\b(asap|urgent|critical|emergency|right ?now)\b/i;
const HIGH = /\b(important|priority|must|hi(gh)? ?prio)\b/i;
const LOW = /\b(someday|eventually|whenever|low ?prio|maybe|sometime)\b/i;

export function inferPriorityFromText(text: string): Priority | null {
  if (URGENT.test(text)) return "urgent";
  if (HIGH.test(text)) return "high";
  if (LOW.test(text)) return "low";
  return null;
}
