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
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = z.object({
  title: z.string().min(1).max(500),
  priority: PrioritySchema,
  schedule: ScheduleSchema.optional(),
});
export type CreateTodo = z.infer<typeof CreateTodoSchema>;

export const UpdateTodoSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(500).optional(),
    priority: PrioritySchema.optional(),
    completed: z.boolean().optional(),
    // undefined = no change; Schedule = set/update; null = remove recurrence.
    schedule: ScheduleSchema.nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.priority !== undefined ||
      v.completed !== undefined ||
      v.schedule !== undefined,
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
