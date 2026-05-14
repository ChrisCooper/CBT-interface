import { test as base, describe, expect } from "vitest";
import { dbFixture } from "../../__tests__/fixtures/db.js";
import { trpcFixture } from "../../__tests__/fixtures/trpc.js";
import { todos } from "../schema.js";

const test = base.extend(dbFixture).extend(trpcFixture);

describe("todos router", () => {
  describe("todos.list", () => {
    test("returns an empty list when no todos exist", async ({ trpc }) => {
      const result = await trpc.todos.list();
      expect(result).toEqual([]);
    });

    test("returns todos ordered by priority asc, then createdAt desc", async ({ db, trpc }) => {
      await db.insert(todos).values({ title: "low priority old", priority: 4 });
      await new Promise((r) => setTimeout(r, 5));
      await db.insert(todos).values({ title: "high priority", priority: 1 });
      await new Promise((r) => setTimeout(r, 5));
      await db.insert(todos).values({ title: "low priority new", priority: 4 });

      const result = await trpc.todos.list();
      expect(result).toHaveLength(3);
      expect(result[0]!.title).toBe("high priority");
      expect(result[1]!.title).toBe("low priority new");
      expect(result[2]!.title).toBe("low priority old");
    });
  });

  describe("todos.create", () => {
    test("creates a todo with the given priority", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "buy milk", priority: 2 });
      expect(created.title).toBe("buy milk");
      expect(created.priority).toBe(2);
      expect(created.completed).toBe(false);
      expect(created.id).toBeDefined();
    });

    test("rejects an empty title", async ({ trpc }) => {
      await expect(trpc.todos.create({ title: "", priority: 3 })).rejects.toThrow();
    });
  });

  describe("todos.update", () => {
    test("toggles completion state", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "task", priority: 3 });

      const completed = await trpc.todos.update({
        id: created.id,
        completed: true,
      });
      expect(completed?.completed).toBe(true);

      const uncompleted = await trpc.todos.update({
        id: created.id,
        completed: false,
      });
      expect(uncompleted?.completed).toBe(false);
    });

    test("updates title and priority", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "old title", priority: 4 });

      const updated = await trpc.todos.update({
        id: created.id,
        title: "new title",
        priority: 1,
      });
      expect(updated?.title).toBe("new title");
      expect(updated?.priority).toBe(1);
      expect(updated?.completed).toBe(false);
    });
  });

  describe("todos.delete", () => {
    test("removes a todo", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "delete me", priority: 4 });

      await trpc.todos.delete({ id: created.id });

      const result = await trpc.todos.list();
      expect(result).toEqual([]);
    });
  });
});
