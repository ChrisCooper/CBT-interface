import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { log } from "../logger.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://dev:dev@localhost:5432/cbt";

log.info({ host: new URL(connectionString).host }, "Connecting to database");

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
