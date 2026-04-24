import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  authorId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = PostSchema.omit({ id: true, createdAt: true });
export type CreatePost = z.infer<typeof CreatePostSchema>;
