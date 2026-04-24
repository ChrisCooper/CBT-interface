import { db } from "./index.js";
import { users, posts } from "./schema.js";

async function seed() {
  console.log("Seeding database...");

  const [alice, bob] = await db
    .insert(users)
    .values([
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ])
    .returning();

  await db.insert(posts).values([
    {
      title: "Hello World",
      content: "First post!",
      authorId: alice!.id,
    },
  ]);

  console.log("Seeded 2 users and 1 post.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
