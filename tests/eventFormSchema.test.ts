import { describe, expect, it } from "vitest";
import { eventFormSchema } from "../src/lib/schemas/event";

describe("eventFormSchema", () => {
  const validBase = {
    title: "Team Standup",
    description: null,
    all_day: false,
    start_local: "2026-05-15T09:00",
    end_local: "2026-05-15T10:00",
    category_id: null,
    rrule: null,
    reminder_offset_minutes: null,
  };

  it("accepts a fully valid event", () => {
    const result = eventFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  // ── title validation ──────────────────────────────────────────────
  it("rejects an empty title", () => {
    const result = eventFormSchema.safeParse({ ...validBase, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes("title"));
      expect(titleError).toBeDefined();
    }
  });

  it("rejects a whitespace-only title", () => {
    const result = eventFormSchema.safeParse({ ...validBase, title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a title at exactly 200 characters", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      title: "a".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  // ── description validation ────────────────────────────────────────
  it("accepts a null description", () => {
    const result = eventFormSchema.safeParse({ ...validBase, description: null });
    expect(result.success).toBe(true);
  });

  it("accepts an optional (missing) description", () => {
    const { description: _, ...noDesc } = validBase;
    const result = eventFormSchema.safeParse(noDesc);
    expect(result.success).toBe(true);
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      description: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  // ── date validation ───────────────────────────────────────────────
  it("rejects empty start_local", () => {
    const result = eventFormSchema.safeParse({ ...validBase, start_local: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty end_local", () => {
    const result = eventFormSchema.safeParse({ ...validBase, end_local: "" });
    expect(result.success).toBe(false);
  });

  it("rejects end before start", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      start_local: "2026-05-15T10:00",
      end_local: "2026-05-15T09:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const endError = result.error.issues.find((i) =>
        i.path.includes("end_local")
      );
      expect(endError).toBeDefined();
      expect(endError?.message).toContain("End must be on or after start");
    }
  });

  it("accepts end equal to start", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      start_local: "2026-05-15T09:00",
      end_local: "2026-05-15T09:00",
    });
    expect(result.success).toBe(true);
  });

  // ── reminder validation ───────────────────────────────────────────
  it("accepts null reminder_offset_minutes", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      reminder_offset_minutes: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts 0 reminder offset", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      reminder_offset_minutes: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative reminder offset", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      reminder_offset_minutes: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects reminder offset above 43200", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      reminder_offset_minutes: 43201,
    });
    expect(result.success).toBe(false);
  });

  it("accepts max reminder offset 43200", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      reminder_offset_minutes: 43200,
    });
    expect(result.success).toBe(true);
  });

  // ── category_id validation ────────────────────────────────────────
  it("accepts null category_id", () => {
    const result = eventFormSchema.safeParse({ ...validBase, category_id: null });
    expect(result.success).toBe(true);
  });

  it("accepts a valid UUID category_id", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      category_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID category_id string", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      category_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  // ── all_day flag ──────────────────────────────────────────────────
  it("accepts all_day = true", () => {
    const result = eventFormSchema.safeParse({ ...validBase, all_day: true });
    expect(result.success).toBe(true);
  });
});
