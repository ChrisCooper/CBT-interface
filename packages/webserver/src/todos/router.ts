import { initTRPC } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema,
} from "shared";
import * as schema from "../db/schema.js";
import { todos } from "./schema.js";
import { log } from "../logger.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const t = initTRPC.create();

export function createTodosRouter(db: Database) {
  return t.router({
    list: t.procedure.query(async () => {
      log.debug("todos.list called");
      return db
        .select()
        .from(todos)
        .orderBy(asc(todos.priority), desc(todos.createdAt));
    }),

    create: t.procedure
      .input(CreateTodoSchema)
      .mutation(async ({ input }) => {
        log.info({ title: input.title, priority: input.priority }, "todos.create called");
        const rows = await db.insert(todos).values(input).returning();
        return rows[0]!;
      }),

    update: t.procedure
      .input(UpdateTodoSchema)
      .mutation(async ({ input }) => {
        const { id, ...fields } = input;
        log.info({ id, ...fields }, "todos.update called");
        const rows = await db
          .update(todos)
          .set(fields)
          .where(eq(todos.id, id))
          .returning();
        return rows[0] ?? null;
      }),

    delete: t.procedure
      .input(DeleteTodoSchema)
      .mutation(async ({ input }) => {
        log.info({ id: input.id }, "todos.delete called");
        await db.delete(todos).where(eq(todos.id, input.id));
        return { id: input.id };
      }),
  });
}
