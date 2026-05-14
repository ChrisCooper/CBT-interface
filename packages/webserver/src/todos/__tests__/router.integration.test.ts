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

    test("returns todos ordered by createdAt desc", async ({ db, trpc }) => {
      await db.insert(todos).values({ title: "first" });
      await new Promise((r) => setTimeout(r, 5));
      await db.insert(todos).values({ title: "second" });

      const result = await trpc.todos.list();
      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe("second");
      expect(result[1]!.title).toBe("first");
    });
  });

  describe("todos.create", () => {
    test("creates a todo with completed=false", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "buy milk" });
      expect(created.title).toBe("buy milk");
      expect(created.completed).toBe(false);
      expect(created.id).toBeDefined();
    });

    test("rejects an empty title", async ({ trpc }) => {
      await expect(trpc.todos.create({ title: "" })).rejects.toThrow();
    });
  });

  describe("todos.setCompleted", () => {
    test("toggles completion state", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "task" });

      const completed = await trpc.todos.setCompleted({
        id: created.id,
        completed: true,
      });
      expect(completed?.completed).toBe(true);

      const uncompleted = await trpc.todos.setCompleted({
        id: created.id,
        completed: false,
      });
      expect(uncompleted?.completed).toBe(false);
    });
  });

  describe("todos.delete", () => {
    test("removes a todo", async ({ trpc }) => {
      const created = await trpc.todos.create({ title: "delete me" });

      await trpc.todos.delete({ id: created.id });

      const result = await trpc.todos.list();
      expect(result).toEqual([]);
    });
  });
});
