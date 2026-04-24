import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { CreatePostSchema, type Post, type User } from "shared";

const t = initTRPC.create();

const users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
];

const posts: Post[] = [
  { id: "1", title: "Hello World", content: "First post!", authorId: "1" },
];

export const appRouter = t.router({
  user: t.router({
    list: t.procedure.query(() => users),

    byId: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        return users.find((u) => u.id === input.id) ?? null;
      }),
  }),

  post: t.router({
    list: t.procedure.query(() => posts),

    create: t.procedure.input(CreatePostSchema).mutation(({ input }) => {
      const post: Post = { ...input, id: String(posts.length + 1) };
      posts.push(post);
      return post;
    }),
  }),
});

export type AppRouter = typeof appRouter;
