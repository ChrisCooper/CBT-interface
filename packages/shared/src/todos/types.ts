import { z } from "zod";
import { ScheduleSchema } from "./schedule.js";

export const PrioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type Priority = z.infer<typeof PrioritySchema>;

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Life Support",
  2: "Essential",
  3: "Important",
  4: "Useful",
};

export const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  1: "Absolutely essential — missing this has serious consequences",
  2: "Should only be missed in extreme circumstances",
  3: "Should be done if at all possible",
  4: "Ideal but has some flexibility",
};

/**
 * Recurring "template" for a todo: the title/priority/schedule applied to
 * each newly-materialized instance. One-off todos have no config.
 */
export const TodoConfigSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  priority: PrioritySchema,
  schedule: ScheduleSchema,
  leadTimeDays: z.number().int().min(0).max(365).nullable(),
  createdAt: z.coerce.date(),
});
export type TodoConfig = z.infer<typeof TodoConfigSchema>;

/**
 * A concrete occurrence the user actually checks off. Each instance may
 * point at a TodoConfig (for recurring series) or stand alone (one-off).
 *
 * `schedule` is denormalized onto the instance for convenience in list
 * responses; it mirrors the parent config's schedule when configId is set.
 */
export const TodoSchema = z.object({
  id: z.string().uuid(),
  configId: z.string().uuid().nullable(),
  title: z.string().min(1).max(500),
  priority: PrioritySchema,
  completed: z.boolean(),
  completedAt: z.coerce.date().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  createdAt: z.coerce.date(),
  schedule: ScheduleSchema.nullable(),
  leadTimeDays: z.number().int().min(0).max(365).nullable(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = z.object({
  title: z.string().min(1).max(500),
  priority: PrioritySchema,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schedule: ScheduleSchema.optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
});
export type CreateTodo = z.infer<typeof CreateTodoSchema>;

export const UpdateTodoSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(500).optional(),
    priority: PrioritySchema.optional(),
    completed: z.boolean().optional(),
    // undefined = no change; string = set; null = remove.
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    // undefined = no change; Schedule = set/update; null = remove recurrence.
    schedule: ScheduleSchema.nullable().optional(),
    // undefined = no change; number = set; null = remove.
    leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.priority !== undefined ||
      v.completed !== undefined ||
      v.dueDate !== undefined ||
      v.schedule !== undefined ||
      v.leadTimeDays !== undefined,
    { message: "At least one field to update must be provided" },
  );
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>;

export const DeleteTodoSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteTodo = z.infer<typeof DeleteTodoSchema>;

export const DeleteSeriesSchema = z.object({
  configId: z.string().uuid(),
});
export type DeleteSeries = z.infer<typeof DeleteSeriesSchema>;

const MAX_PRIORITY = 4;

export interface UrgencyBreakdown {
  priorityValue: number;
  timeUrgency: number;
  urgency: number;
}

/**
 * Compute urgency on demand from priority and lead-time progress.
 * When lead time is absent, time urgency defaults to 1 (always urgent).
 * Returns null only when there's no due date.
 */
export function computeUrgency(
  priority: Priority,
  dueDate: string | null,
  leadTimeDays: number | null,
  today?: Date,
): UrgencyBreakdown | null {
  if (!dueDate) return null;

  const priorityValue = (MAX_PRIORITY - priority) / (MAX_PRIORITY - 1);

  let timeUrgency: number;
  if (!leadTimeDays || leadTimeDays <= 0) {
    timeUrgency = 1;
  } else {
    const now = today ?? new Date();
    const todayUtc = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const [y, m, d] = dueDate.split("-").map(Number) as [number, number, number];
    const due = new Date(Date.UTC(y, m - 1, d));

    const daysUntilDue = Math.round(
      (due.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000),
    );
    const daysIntoLeadTime = leadTimeDays - daysUntilDue;
    timeUrgency = Math.max(0, Math.min(1, daysIntoLeadTime / leadTimeDays));
  }

  const urgency = priorityValue * timeUrgency;
  return { priorityValue, timeUrgency, urgency };
}
