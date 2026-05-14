import { db } from "./index.js";
import { seedInitialTodos } from "./init-data.js";
import { log } from "../logger.js";

async function seed() {
  log.info("Seeding database...");

  const count = await seedInitialTodos(db);
  log.info(`Seeded ${count} recurring todos.`);

  process.exit(0);
}

seed().catch((err) => {
  log.fatal(err, "Seed failed");
  process.exit(1);
});
