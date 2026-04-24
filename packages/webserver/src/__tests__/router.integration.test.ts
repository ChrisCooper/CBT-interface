import { test as base, describe, expect } from "vitest";
import { dbFixture } from "./fixtures/db.js";
import { trpcFixture } from "./fixtures/trpc.js";
import * as schema from "../db/schema.js";

const test = base.extend(dbFixture).extend(trpcFixture);

describe("router integration", () => {
  describe("user.list", () => {
    test("returns an empty list when no users exist", async ({ trpc }) => {
      const result = await trpc.user.list();
      expect(result).toEqual([]);
    });

    test("returns inserted users", async ({ db, trpc }) => {
      await db
        .insert(schema.users)
        .values({ name: "Alice", email: "alice@test.com" });

      const result = await trpc.user.list();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "Alice",
        email: "alice@test.com",
      });
      expect(result[0]!.id).toBeDefined();
    });
  });

  describe("user.byId", () => {
    test("returns null for a non-existent user", async ({ trpc }) => {
      const result = await trpc.user.byId({
        id: "00000000-0000-0000-0000-000000000000",
      });
      expect(result).toBeNull();
    });

    test("returns the correct user by id", async ({ db, trpc }) => {
      const [inserted] = await db
        .insert(schema.users)
        .values({ name: "Bob", email: "bob@test.com" })
        .returning();

      const result = await trpc.user.byId({ id: inserted!.id });
      expect(result).toMatchObject({ name: "Bob", email: "bob@test.com" });
    });
  });

  describe("post.list", () => {
    test("returns an empty list when no posts exist", async ({ trpc }) => {
      const result = await trpc.post.list();
      expect(result).toEqual([]);
    });

    test("returns posts ordered by createdAt", async ({ db, trpc }) => {
      const [author] = await db
        .insert(schema.users)
        .values({ name: "Eve", email: "eve@test.com" })
        .returning();

      await db.insert(schema.posts).values([
        { title: "First", content: "aaa", authorId: author!.id },
        { title: "Second", content: "bbb", authorId: author!.id },
      ]);

      const result = await trpc.post.list();
      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe("First");
      expect(result[1]!.title).toBe("Second");
    });
  });

  describe("post.create", () => {
    test("creates a post and returns it", async ({ db, trpc }) => {
      const [author] = await db
        .insert(schema.users)
        .values({ name: "Carol", email: "carol@test.com" })
        .returning();

      const created = await trpc.post.create({
        title: "New Post",
        content: "Hello!",
        authorId: author!.id,
      });

      expect(created).toMatchObject({
        title: "New Post",
        content: "Hello!",
        authorId: author!.id,
      });
      expect(created.id).toBeDefined();
      expect(created.createdAt).toBeDefined();

      const posts = await trpc.post.list();
      expect(posts).toHaveLength(1);
    });
  });
});
