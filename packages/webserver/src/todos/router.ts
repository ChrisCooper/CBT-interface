import { initTRPC } from "@trpc/server";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema,
  DeleteSeriesSchema,
  firstDueDate,
  nextDueDate,
  toIsoDate,
  fromIsoDate,
  type Schedule,
} from "shared";
import * as schema from "../db/schema.js";
import { todoConfigs, todos } from "./schema.js";
import { log } from "../logger.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const t = initTRPC.create();

/**
 * After any change to a config-backed todo (create / edit / complete), make
 * sure there's exactly one open instance whose dueDate reflects the schedule.
 * Idempotent: if an open instance already exists this is a no-op.
 */
async function ensureNextInstance(
  db: Database,
  configId: string,
  now: Date = new Date(),
): Promise<void> {
  const configRows = await db
    .select()
    .from(todoConfigs)
    .where(eq(todoConfigs.id, configId));
  const config = configRows[0];
  if (!config) return;

  // Already an open instance? Done.
  const openRows = await db
    .select({ id: todos.id })
    .from(todos)
    .where(and(eq(todos.configId, configId), eq(todos.completed, false)))
    .limit(1);
  if (openRows.length > 0) return;

  // Otherwise compute the next dueDate from the most recently completed
  // instance, falling back to "first occurrence on or after today".
  const lastCompleted = await db
    .select()
    .from(todos)
    .where(and(eq(todos.configId, configId), eq(todos.completed, true)))
    .orderBy(desc(todos.completedAt))
    .limit(1);

  const schedule = config.schedule as Schedule;
  let due: Date;
  if (lastCompleted.length === 0) {
    due = firstDueDate(schedule, now);
  } else {
    const prev = lastCompleted[0]!;
    if (schedule.type === "interval") {
      // Interval is anchored on the actual completion timestamp.
      due = nextDueDate(schedule, prev.completedAt ?? now);
    } else {
      // Calendar schedules walk forward from the previous instance's dueDate
      // (or completion date if dueDate is missing for any reason).
      const anchor = prev.dueDate
        ? fromIsoDate(prev.dueDate)
        : (prev.completedAt ?? now);
      due = nextDueDate(schedule, anchor);
    }
  }

  await db.insert(todos).values({
    configId,
    title: config.title,
    priority: config.priority,
    dueDate: toIsoDate(due),
    leadTimeDays: config.leadTimeDays,
  });
}

/**
 * Shape returned by `todos.list`: a left join of todos with their config,
 * flattened so the schedule sits alongside the instance fields.
 */
function listQuery(db: Database) {
  return db
    .select({
      id: todos.id,
      configId: todos.configId,
      title: todos.title,
      priority: todos.priority,
      completed: todos.completed,
      completedAt: todos.completedAt,
      dueDate: todos.dueDate,
      createdAt: todos.createdAt,
      schedule: todoConfigs.schedule,
      isUpkeep: todoConfigs.isUpkeep,
      leadTimeDays: todos.leadTimeDays,
    })
    .from(todos)
    .leftJoin(todoConfigs, eq(todos.configId, todoConfigs.id));
}

export function createTodosRouter(db: Database) {
  return t.router({
    list: t.procedure.query(async () => {
      log.debug("todos.list called");
      return listQuery(db).orderBy(
        asc(todos.completed),
        // Open items first (nearest dueDate, nulls last); completed go last.
        sql`${todos.dueDate} asc nulls last`,
        asc(todos.priority),
        desc(todos.createdAt),
      );
    }),

    create: t.procedure
      .input(CreateTodoSchema)
      .mutation(async ({ input }) => {
        log.info(
          { title: input.title, priority: input.priority, schedule: input.schedule },
          "todos.create called",
        );

        if (!input.schedule) {
          const rows = await db
            .insert(todos)
            .values({
              title: input.title,
              priority: input.priority,
              dueDate: input.dueDate ?? null,
              leadTimeDays: input.leadTimeDays ?? null,
            })
            .returning();
          const out = rows[0]!;
          return {
            ...out,
            schedule: null as Schedule | null,
            isUpkeep: false,
          };
        }

        // Recurring: create config first, then materialize the first instance
        // via the shared ensureNextInstance path so anchor logic stays in one place.
        const configRows = await db
          .insert(todoConfigs)
          .values({
            title: input.title,
            priority: input.priority,
            schedule: input.schedule,
            leadTimeDays: input.leadTimeDays ?? null,
          })
          .returning();
        const config = configRows[0]!;
        await ensureNextInstance(db, config.id);

        const created = await listQuery(db)
          .where(eq(todos.configId, config.id))
          .orderBy(desc(todos.createdAt))
          .limit(1);
        return created[0]!;
      }),

    update: t.procedure
      .input(UpdateTodoSchema)
      .mutation(async ({ input }) => {
        const { id, dueDate, schedule, leadTimeDays, ...fields } = input;
        log.info({ id, ...fields, scheduleChange: schedule !== undefined }, "todos.update called");

        const existingRows = await db
          .select()
          .from(todos)
          .where(eq(todos.id, id));
        const existing = existingRows[0];
        if (!existing) return null;

        // Build instance-level update.
        const instanceUpdate: Partial<typeof todos.$inferInsert> = {};
        if (fields.title !== undefined) instanceUpdate.title = fields.title;
        if (fields.priority !== undefined) instanceUpdate.priority = fields.priority;
        if (fields.completed !== undefined) {
          instanceUpdate.completed = fields.completed;
          instanceUpdate.completedAt = fields.completed ? new Date() : null;
        }
        if (dueDate !== undefined) instanceUpdate.dueDate = dueDate;
        if (leadTimeDays !== undefined) instanceUpdate.leadTimeDays = leadTimeDays;

        if (Object.keys(instanceUpdate).length > 0) {
          await db.update(todos).set(instanceUpdate).where(eq(todos.id, id));
        }

        // Schedule transitions:
        //   undefined        -> no change to recurrence
        //   null + had config-> remove recurrence: delete config (cascade clears siblings)
        //                       and disassociate this instance so it survives as a one-off.
        //   Schedule + no cfg-> promote one-off to recurring: create a config and link.
        //   Schedule + cfg   -> update existing config.
        let configIdAfter: string | null = existing.configId;

        if (schedule === null && existing.configId) {
          // Disassociate this instance so the cascade doesn't take it with the config.
          await db
            .update(todos)
            .set({ configId: null })
            .where(eq(todos.id, id));
          await db
            .delete(todoConfigs)
            .where(eq(todoConfigs.id, existing.configId));
          configIdAfter = null;
        } else if (schedule && !existing.configId) {
          // Promote: use the (possibly just-updated) instance fields as the new config defaults.
          const title = instanceUpdate.title ?? existing.title;
          const priority = instanceUpdate.priority ?? existing.priority;
          const configRows = await db
            .insert(todoConfigs)
            .values({
              title,
              priority,
              schedule,
              leadTimeDays: leadTimeDays ?? null,
            })
            .returning();
          configIdAfter = configRows[0]!.id;
          await db
            .update(todos)
            .set({ configId: configIdAfter })
            .where(eq(todos.id, id));
        } else if (schedule && existing.configId) {
          // Update existing config's schedule (and keep its defaults in sync if title/priority changed).
          const cfgUpdate: Partial<typeof todoConfigs.$inferInsert> = { schedule };
          if (fields.title !== undefined) cfgUpdate.title = fields.title;
          if (fields.priority !== undefined) cfgUpdate.priority = fields.priority;
          if (leadTimeDays !== undefined) cfgUpdate.leadTimeDays = leadTimeDays;
          await db
            .update(todoConfigs)
            .set(cfgUpdate)
            .where(eq(todoConfigs.id, existing.configId));
        } else if (existing.configId) {
          const cfgUpdate: Partial<typeof todoConfigs.$inferInsert> = {};
          if (fields.title !== undefined) cfgUpdate.title = fields.title;
          if (fields.priority !== undefined) cfgUpdate.priority = fields.priority;
          if (leadTimeDays !== undefined) cfgUpdate.leadTimeDays = leadTimeDays;
          if (Object.keys(cfgUpdate).length > 0) {
            await db
              .update(todoConfigs)
              .set(cfgUpdate)
              .where(eq(todoConfigs.id, existing.configId));
          }
        }

        // Ensure the next instance exists if we're still tied to a config.
        // This covers all three triggers: save, edit, complete.
        if (configIdAfter) {
          await ensureNextInstance(db, configIdAfter);
        }

        const after = await listQuery(db)
          .where(eq(todos.id, id))
          .limit(1);
        return after[0] ?? null;
      }),

    delete: t.procedure
      .input(DeleteTodoSchema)
      .mutation(async ({ input }) => {
        log.info({ id: input.id }, "todos.delete called");
        const rows = await db
          .delete(todos)
          .where(eq(todos.id, input.id))
          .returning({ configId: todos.configId });
        // If we just deleted an instance of a series and that left no open
        // instance, materialize the next one — the series shouldn't silently
        // vanish from the user's list.
        const configId = rows[0]?.configId;
        if (configId) {
          await ensureNextInstance(db, configId);
        }
        return { id: input.id };
      }),

    /**
     * Delete an entire recurring series: drops the config, which cascades to
     * every instance (completed history included). Use this when the user
     * wants to stop a recurrence entirely.
     */
    deleteSeries: t.procedure
      .input(DeleteSeriesSchema)
      .mutation(async ({ input }) => {
        log.info({ configId: input.configId }, "todos.deleteSeries called");
        await db.delete(todoConfigs).where(eq(todoConfigs.id, input.configId));
        return { configId: input.configId };
      }),

    /**
     * Aggregate completion stats per config. Demonstrates that the
     * instance↔config association is rich enough to compute series-level
     * metrics (one-off todos are excluded since they have no series).
     */
    stats: t.procedure.query(async () => {
      log.debug("todos.stats called");
      const rows = await db
        .select({
          configId: todos.configId,
          title: todoConfigs.title,
          schedule: todoConfigs.schedule,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${todos.completed})::int`,
        })
        .from(todos)
        .innerJoin(todoConfigs, eq(todos.configId, todoConfigs.id))
        .where(isNotNull(todos.configId))
        .groupBy(todos.configId, todoConfigs.title, todoConfigs.schedule);
      return rows.map((r) => ({
        ...r,
        completionRate: r.total > 0 ? r.completed / r.total : 0,
      }));
    }),
  });
}
