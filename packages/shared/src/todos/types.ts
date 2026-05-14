import { z } from "zod";

export const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  completed: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = TodoSchema.pick({ title: true });
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
