import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
});

export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = PostSchema.omit({ id: true });
export type CreatePost = z.infer<typeof CreatePostSchema>;
