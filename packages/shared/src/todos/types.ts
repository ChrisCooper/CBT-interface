import { z } from "zod";

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

export const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  priority: PrioritySchema,
  completed: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = TodoSchema.pick({ title: true, priority: true });
export type CreateTodo = z.infer<typeof CreateTodoSchema>;

export const UpdateTodoSchema = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
});
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>;

export const DeleteTodoSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteTodo = z.infer<typeof DeleteTodoSchema>;
