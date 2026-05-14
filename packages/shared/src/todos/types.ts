import { z } from "zod";
import { ScheduleSchema, fromIsoDate } from "./schedule.js";

export const PrioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type Priority = z.infer<typeof PrioritySchema>;

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Critical",
  2: "Important",
  3: "Useful",
  4: "Chill",
};

export const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  1: "Absolutely essential — missing this has serious consequences",
  2: "Should be done if at all possible",
  3: "Ideal but has some flexibility",
  4: "Low-stakes — do it whenever",
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
  isUpkeep: z.boolean(),
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
  isUpkeep: z.boolean(),
  leadTimeDays: z.number().int().min(0).max(365).nullable(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = z.object({
  title: z.string().min(1).max(500),
  priority: PrioritySchema,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schedule: ScheduleSchema.optional(),
  isUpkeep: z.boolean().optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
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
    isUpkeep: z.boolean().optional(),
    // undefined = no change; number = set; null = remove.
    leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
    // undefined = no change; array = replace all tag associations.
    tagIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.priority !== undefined ||
      v.completed !== undefined ||
      v.dueDate !== undefined ||
      v.schedule !== undefined ||
      v.isUpkeep !== undefined ||
      v.leadTimeDays !== undefined ||
      v.tagIds !== undefined,
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

export const TAG_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export const TagColorSchema = z.enum(TAG_COLORS);
export type TagColor = z.infer<typeof TagColorSchema>;

export const TAG_COLOR_CLASSES: Record<TagColor, { bg: string; text: string }> = {
  gray:   { bg: "bg-gray-100",   text: "text-gray-700" },
  red:    { bg: "bg-red-100",    text: "text-red-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700" },
  green:  { bg: "bg-green-100",  text: "text-green-700" },
  blue:   { bg: "bg-blue-100",   text: "text-blue-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  pink:   { bg: "bg-pink-100",   text: "text-pink-700" },
};

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: TagColorSchema,
  createdAt: z.coerce.date(),
});
export type Tag = z.infer<typeof TagSchema>;

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: TagColorSchema,
});
export type CreateTag = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  color: TagColorSchema.optional(),
});
export type UpdateTag = z.infer<typeof UpdateTagSchema>;

export const DeleteTagSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteTag = z.infer<typeof DeleteTagSchema>;

const MAX_PRIORITY = 4;

export interface WeightedPriorityBreakdown {
  priority: number;
  urgency: number;
  weightedPriority: number;
}

/**
 * Compute weighted priority on demand: priority × urgency.
 *   - priority: mapped from the 1–4 scale to 1.0 (highest) – 0.25 (lowest).
 *   - urgency: fraction of lead time elapsed (0→1). Defaults to 1 when no lead time.
 * Returns null only when there's no due date.
 */
export function computeWeightedPriority(
  pri: Priority,
  dueDate: string | null,
  leadTimeDays: number | null,
  today: Date,
): WeightedPriorityBreakdown | null {
  if (!dueDate) return null;

  const MIN_PRIORITY_WEIGHT = 0.25;
  const priority =
    MIN_PRIORITY_WEIGHT +
    (1 - MIN_PRIORITY_WEIGHT) * ((MAX_PRIORITY - pri) / (MAX_PRIORITY - 1));

  let urgency: number;
  if (!leadTimeDays || leadTimeDays <= 0) {
    urgency = 1;
  } else {
    const due = fromIsoDate(dueDate);
    const daysUntilDue = Math.round(
      (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );
    const daysIntoLeadTime = leadTimeDays - daysUntilDue;
    urgency = Math.max(0, Math.min(1, daysIntoLeadTime / leadTimeDays));
  }

  const weightedPriority = priority * urgency;
  return { priority, urgency, weightedPriority };
}
