import { z } from "zod";

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
    description: z
      .string()
      .trim()
      .max(2000, "Description is too long")
      .optional()
      .nullable(),
    all_day: z.boolean(),
    start_local: z.string().min(1, "Start is required"),
    end_local: z.string().min(1, "End is required"),
    category_id: z.string().uuid().nullable().optional(),
    rrule: z.any().nullable(),
    reminder_offset_minutes: z
      .number()
      .int()
      .min(0)
      .max(43200)
      .nullable()
      .optional(),
  })
  .refine(
    (v) => {
      const start = new Date(v.start_local);
      const end = new Date(v.end_local);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      return end >= start;
    },
    { message: "End must be on or after start", path: ["end_local"] }
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;
