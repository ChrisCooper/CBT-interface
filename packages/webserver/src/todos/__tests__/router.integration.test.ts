import { test as base, describe, expect } from "vitest";
import { eq } from "drizzle-orm";
import { dbFixture } from "../../__tests__/fixtures/db.js";
import { trpcFixture } from "../../__tests__/fixtures/trpc.js";
import { todos, todoConfigs } from "../schema.js";

const test = base.extend(dbFixture).extend(trpcFixture);

describe("todos router", () => {
  describe("todos.list", () => {
    test("returns an empty list when no todos exist", async ({ trpc }) => {
      const result = await trpc.todos.list();
      expect(result).toEqual([]);
    });

    test("open before completed, then dueDate, priority, createdAt", async ({
      db,
      trpc,
    }) => {
      await db.insert(todos).values({ title: "done", priority: 1, completed: true });
      await db.insert(todos).values({ title: "open low", priority: 4 });
      await db.insert(todos).values({ title: "open high", priority: 1 });
      await db
        .insert(todos)
        .values({ title: "open due soon", priority: 4, dueDate: "2026-05-14" });

      const result = await trpc.todos.list();
      expect(result.map((r) => r.title)).toEqual([
        "open due soon",
        "open high",
        "open low",
        "done",
      ]);
    });
  });

  describe("todos.create", () => {
    test("creates a one-off todo without a config", async ({ trpc, db }) => {
      const created = await trpc.todos.create({ title: "buy milk", priority: 2 });
      expect(created.title).toBe("buy milk");
      expect(created.priority).toBe(2);
      expect(created.completed).toBe(false);
      expect(created.configId).toBeNull();
      expect(created.schedule).toBeNull();

      const configRows = await db.select().from(todoConfigs);
      expect(configRows).toEqual([]);
    });

    test("creates a config and first instance for a recurring todo", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "water plants",
        priority: 3,
        schedule: { type: "interval", intervalDays: 5 },
      });

      expect(created.configId).not.toBeNull();
      expect(created.schedule).toEqual({ type: "interval", intervalDays: 5 });
      expect(created.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const configRows = await db.select().from(todoConfigs);
      expect(configRows).toHaveLength(1);
      expect(configRows[0]!.title).toBe("water plants");
      expect(configRows[0]!.schedule).toEqual({
        type: "interval",
        intervalDays: 5,
      });
    });

    test("rejects an empty title", async ({ trpc }) => {
      await expect(
        trpc.todos.create({ title: "", priority: 3 }),
      ).rejects.toThrow();
    });
  });

  describe("todos.update", () => {
    test("toggles completion state on a one-off", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "task", priority: 3 });

      const completed = await trpc.todos.update({
        id: created.id,
        completed: true,
      });
      expect(completed?.completed).toBe(true);
      expect(completed?.completedAt).not.toBeNull();

      const uncompleted = await trpc.todos.update({
        id: created.id,
        completed: false,
      });
      expect(uncompleted?.completed).toBe(false);
      expect(uncompleted?.completedAt).toBeNull();
    });

    test("updates title and priority on a one-off", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "old title", priority: 4 });

      const updated = await trpc.todos.update({
        id: created.id,
        title: "new title",
        priority: 1,
      });
      expect(updated?.title).toBe("new title");
      expect(updated?.priority).toBe(1);
    });

    test("promotes a one-off to a recurring todo when given a schedule", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({ title: "rent", priority: 2 });
      expect(created.configId).toBeNull();

      const updated = await trpc.todos.update({
        id: created.id,
        schedule: { type: "day_of_month", dayOfMonth: 12 },
      });
      expect(updated?.configId).not.toBeNull();
      expect(updated?.schedule).toEqual({ type: "day_of_month", dayOfMonth: 12 });

      const configRows = await db.select().from(todoConfigs);
      expect(configRows).toHaveLength(1);
      expect(configRows[0]!.title).toBe("rent");
    });

    test("removes recurrence when schedule is set to null", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "soccer",
        priority: 3,
        schedule: { type: "day_of_week", dayOfWeek: 4 },
      });
      expect(created.configId).not.toBeNull();

      const updated = await trpc.todos.update({
        id: created.id,
        schedule: null,
      });

      // The instance survives as a one-off.
      expect(updated?.id).toBe(created.id);
      expect(updated?.configId).toBeNull();
      expect(updated?.schedule).toBeNull();

      // The config is gone.
      const configRows = await db.select().from(todoConfigs);
      expect(configRows).toEqual([]);
    });

    test("propagates title/priority changes to the config", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "water plants",
        priority: 3,
        schedule: { type: "interval", intervalDays: 5 },
      });

      await trpc.todos.update({
        id: created.id,
        title: "water orchids",
        priority: 2,
      });

      const configRows = await db.select().from(todoConfigs);
      expect(configRows[0]!.title).toBe("water orchids");
      expect(configRows[0]!.priority).toBe(2);
    });

    test("completing a recurring todo materializes the next instance", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "water plants",
        priority: 3,
        schedule: { type: "interval", intervalDays: 5 },
      });
      expect(created.configId).not.toBeNull();

      // One instance to start with.
      let allRows = await db.select().from(todos);
      expect(allRows).toHaveLength(1);

      // Completing it should create a successor.
      await trpc.todos.update({ id: created.id, completed: true });

      allRows = await db
        .select()
        .from(todos)
        .where(eq(todos.configId, created.configId!));
      expect(allRows).toHaveLength(2);

      const open = allRows.filter((r) => !r.completed);
      const done = allRows.filter((r) => r.completed);
      expect(open).toHaveLength(1);
      expect(done).toHaveLength(1);
      expect(open[0]!.title).toBe("water plants");
      expect(open[0]!.priority).toBe(3);
      expect(open[0]!.dueDate).not.toBeNull();
      // Successor must be in the future relative to the completed one.
      expect(open[0]!.dueDate! > done[0]!.dueDate!).toBe(true);
    });

    test("interval next dueDate is intervalDays after completedAt", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "water plants",
        priority: 3,
        schedule: { type: "interval", intervalDays: 5 },
      });

      const before = new Date();
      await trpc.todos.update({ id: created.id, completed: true });
      const after = new Date();

      const rows = await db
        .select()
        .from(todos)
        .where(eq(todos.configId, created.configId!));
      const successor = rows.find((r) => !r.completed)!;

      const due = new Date(successor.dueDate + "T00:00:00Z");
      const minExpected = new Date(
        Date.UTC(
          before.getUTCFullYear(),
          before.getUTCMonth(),
          before.getUTCDate() + 5,
        ),
      );
      const maxExpected = new Date(
        Date.UTC(
          after.getUTCFullYear(),
          after.getUTCMonth(),
          after.getUTCDate() + 5,
        ),
      );
      expect(due.getTime()).toBeGreaterThanOrEqual(minExpected.getTime());
      expect(due.getTime()).toBeLessThanOrEqual(maxExpected.getTime());
    });

    test("does not duplicate the next instance if one already exists", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "rent",
        priority: 2,
        schedule: { type: "day_of_month", dayOfMonth: 12 },
      });

      // Multiple unrelated updates shouldn't keep creating new open instances.
      await trpc.todos.update({ id: created.id, title: "rent (updated)" });
      await trpc.todos.update({ id: created.id, priority: 1 });

      const rows = await db
        .select()
        .from(todos)
        .where(eq(todos.configId, created.configId!));
      expect(rows.filter((r) => !r.completed)).toHaveLength(1);
    });
  });

  describe("todos.delete", () => {
    test("removes a one-off todo", async ({ trpc }) => {
      const created = await trpc.todos.create({
        title: "delete me",
        priority: 4,
      });

      await trpc.todos.delete({ id: created.id });

      const result = await trpc.todos.list();
      expect(result).toEqual([]);
    });

    test("deleting a recurring instance leaves a fresh open instance", async ({
      trpc,
      db,
    }) => {
      const created = await trpc.todos.create({
        title: "water plants",
        priority: 3,
        schedule: { type: "interval", intervalDays: 5 },
      });

      await trpc.todos.delete({ id: created.id });

      const rows = await db
        .select()
        .from(todos)
        .where(eq(todos.configId, created.configId!));
      expect(rows.filter((r) => !r.completed)).toHaveLength(1);
      expect(rows[0]!.id).not.toBe(created.id);
    });
  });

  describe("todos.deleteSeries", () => {
    test("cascades to remove every instance", async ({ trpc, db }) => {
      const created = await trpc.todos.create({
        title: "soccer",
        priority: 3,
        schedule: { type: "day_of_week", dayOfWeek: 4 },
      });
      await trpc.todos.update({ id: created.id, completed: true });
      // After completion there is a completed instance plus the next open one.

      await trpc.todos.deleteSeries({ configId: created.configId! });

      const configRows = await db.select().from(todoConfigs);
      const todoRows = await db.select().from(todos);
      expect(configRows).toEqual([]);
      expect(todoRows).toEqual([]);
    });
  });

  describe("todos.stats", () => {
    test("reports completion rates per config", async ({ trpc }) => {
      const created = await trpc.todos.create({
        title: "water plants",
        priority: 3,
        schedule: { type: "interval", intervalDays: 1 },
      });

      // Complete the first, which materializes a second; complete that too.
      await trpc.todos.update({ id: created.id, completed: true });
      const list1 = await trpc.todos.list();
      const next = list1.find(
        (t) => t.configId === created.configId && !t.completed,
      )!;
      await trpc.todos.update({ id: next.id, completed: true });

      const stats = await trpc.todos.stats();
      expect(stats).toHaveLength(1);
      expect(stats[0]!.configId).toBe(created.configId);
      expect(stats[0]!.total).toBe(3); // 2 completed + 1 fresh open
      expect(stats[0]!.completed).toBe(2);
      expect(stats[0]!.completionRate).toBeCloseTo(2 / 3, 5);
    });

    test("excludes one-off todos", async ({ trpc }) => {
      await trpc.todos.create({ title: "one-off", priority: 3 });
      const stats = await trpc.todos.stats();
      expect(stats).toEqual([]);
    });
  });
});
