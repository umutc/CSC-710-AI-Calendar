const TEMPORAL = /\b(today|tonight|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|next month|this month|in \d+ (day|hour|minute|week|month)s?|at \d{1,2}(:\d{2})?\s*(am|pm)|(\d{1,2})(am|pm)\b|morning|afternoon|evening|noon|midnight|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i;

const EVENT_NOUNS = /\b(meeting|appointment|call|lunch|dinner|breakfast|brunch|interview|class|session|gym|dentist|doctor|event|reminder|standup|sync|review|demo|presentation|conference|workshop|seminar|birthday|anniversary|deadline|flight|trip|vacation|party|wedding|pickup|dropoff|pickup|coffee|catchup|check-?in|one-?on-?one|1:1)\b/i;

export function looksLikeNL(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10) return false;
  return TEMPORAL.test(trimmed) || EVENT_NOUNS.test(trimmed);
}
