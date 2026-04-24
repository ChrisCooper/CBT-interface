import { db } from "./index.js";
import { users, posts } from "./schema.js";
import { log } from "../logger.js";

async function seed() {
  log.info("Seeding database...");

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

  log.info("Seeded 2 users and 1 post.");
  process.exit(0);
}

seed().catch((err) => {
  log.fatal(err, "Seed failed");
  process.exit(1);
});
