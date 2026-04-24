import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { CreatePostSchema } from "shared";
import { db } from "./db/index.js";
import { users, posts } from "./db/schema.js";

const t = initTRPC.create();

export const appRouter = t.router({
  user: t.router({
    list: t.procedure.query(() => db.select().from(users)),

    byId: t.procedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.id, input.id));
        return rows[0] ?? null;
      }),
  }),

  post: t.router({
    list: t.procedure.query(() =>
      db.select().from(posts).orderBy(posts.createdAt),
    ),

    create: t.procedure.input(CreatePostSchema).mutation(async ({ input }) => {
      const rows = await db.insert(posts).values(input).returning();
      return rows[0]!;
    }),
  }),
});

export type AppRouter = typeof appRouter;
