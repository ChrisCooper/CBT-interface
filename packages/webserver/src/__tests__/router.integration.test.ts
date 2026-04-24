import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema.js";
import { createAppRouter } from "../router.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

describe("router integration", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caller: any;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });

    const router = createAppRouter(db as any);
    caller = router.createCaller({});
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM posts`);
    await db.execute(sql`DELETE FROM users`);
  });

  describe("user.list", () => {
    it("returns an empty list when no users exist", async () => {
      const result = await caller.user.list();
      expect(result).toEqual([]);
    });

    it("returns inserted users", async () => {
      await db
        .insert(schema.users)
        .values({ name: "Alice", email: "alice@test.com" });

      const result = await caller.user.list();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "Alice",
        email: "alice@test.com",
      });
      expect(result[0]!.id).toBeDefined();
    });
  });

  describe("user.byId", () => {
    it("returns null for a non-existent user", async () => {
      const result = await caller.user.byId({
        id: "00000000-0000-0000-0000-000000000000",
      });
      expect(result).toBeNull();
    });

    it("returns the correct user by id", async () => {
      const [inserted] = await db
        .insert(schema.users)
        .values({ name: "Bob", email: "bob@test.com" })
        .returning();

      const result = await caller.user.byId({ id: inserted!.id });
      expect(result).toMatchObject({ name: "Bob", email: "bob@test.com" });
    });
  });

  describe("post.list", () => {
    it("returns an empty list when no posts exist", async () => {
      const result = await caller.post.list();
      expect(result).toEqual([]);
    });

    it("returns posts ordered by createdAt", async () => {
      const [author] = await db
        .insert(schema.users)
        .values({ name: "Eve", email: "eve@test.com" })
        .returning();

      await db.insert(schema.posts).values([
        { title: "First", content: "aaa", authorId: author!.id },
        { title: "Second", content: "bbb", authorId: author!.id },
      ]);

      const result = await caller.post.list();
      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe("First");
      expect(result[1]!.title).toBe("Second");
    });
  });

  describe("post.create", () => {
    it("creates a post and returns it", async () => {
      const [author] = await db
        .insert(schema.users)
        .values({ name: "Carol", email: "carol@test.com" })
        .returning();

      const created = await caller.post.create({
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

      const posts = await caller.post.list();
      expect(posts).toHaveLength(1);
    });
  });
});
