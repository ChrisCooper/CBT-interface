import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { CreatePostSchema } from "shared";
import { db as defaultDb } from "./db/index.js";
import * as schema from "./db/schema.js";
import { users, posts } from "./db/schema.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const t = initTRPC.create();

export function createAppRouter(db: Database = defaultDb) {
  return t.router({
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

      create: t.procedure
        .input(CreatePostSchema)
        .mutation(async ({ input }) => {
          const rows = await db.insert(posts).values(input).returning();
          return rows[0]!;
        }),
    }),
  });
}

export const appRouter = createAppRouter();
export type AppRouter = typeof appRouter;
