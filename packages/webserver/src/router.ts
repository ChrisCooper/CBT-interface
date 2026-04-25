import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { generateObject, generateText } from "ai";
import type { LanguageModel } from "ai";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { CreatePostSchema } from "shared";
import { db as defaultDb } from "./db/index.js";
import * as schema from "./db/schema.js";
import { users, posts } from "./db/schema.js";
import { log } from "./logger.js";
import { container } from "./container.js";
import { LLM } from "./ai.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const t = initTRPC.create();

export function createAppRouter(
  db: Database = defaultDb,
  llm: LLM = container.resolve(LLM),
) {
  return t.router({
    user: t.router({
      list: t.procedure.query(async () => {
        log.debug("user.list called");
        return db.select().from(users);
      }),

      byId: t.procedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ input }) => {
          log.debug({ userId: input.id }, "user.byId called");
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.id, input.id));
          return rows[0] ?? null;
        }),
    }),

    post: t.router({
      list: t.procedure.query(async () => {
        log.debug("post.list called");
        return db.select().from(posts).orderBy(posts.createdAt);
      }),

      create: t.procedure
        .input(CreatePostSchema)
        .mutation(async ({ input }) => {
          log.info({ title: input.title, authorId: input.authorId }, "post.create called");
          const rows = await db.insert(posts).values(input).returning();
          return rows[0]!;
        }),
    }),

    ai: t.router({
      summarize: t.procedure
        .input(z.object({ text: z.string().min(1).max(4096) }))
        .mutation(async ({ input }) => {
          log.info("ai.summarize called");

          const { object } = await generateObject({
            model: llm.model(),
            schema: z.object({
              summary: z.string().describe("A concise summary of the input text"),
              sentiment: z.enum(["positive", "negative", "neutral"]).describe("Overall sentiment"),
              keywords: z.array(z.string()).describe("Key topics mentioned"),
            }),
            prompt: `Analyze the following text and return a structured summary:\n\n${input.text}`,
          });

          return object;
        }),

      query: t.procedure
        .input(
          z.object({
            prompt: z.string().min(1).max(8192),
            image: z
              .string()
              .describe("Base64-encoded data URL (e.g. data:image/png;base64,...)")
              .optional(),
          }),
        )
        .mutation(async ({ input }) => {
          log.info("ai.query called");

          const content: Array<
            | { type: "text"; text: string }
            | { type: "image"; image: string }
          > = [{ type: "text", text: input.prompt }];

          if (input.image) {
            content.push({ type: "image", image: input.image });
          }

          const { text } = await generateText({
            model: llm.model(),
            messages: [{ role: "user", content }],
          });

          return { response: text };
        }),
    }),
  });
}

export const appRouter = createAppRouter();
export type AppRouter = typeof appRouter;
