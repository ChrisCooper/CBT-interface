import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { Schedule, TagColor } from "shared";

/**
 * Recurring "template" for a todo. Each new instance materialized from a
 * config copies the config's title/priority and uses its schedule to
 * compute a due date. One-off todos have no config row.
 */
export const todoConfigs = pgTable("todo_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  priority: integer("priority").notNull(),
  schedule: jsonb("schedule").$type<Schedule>().notNull(),
  isUpkeep: boolean("is_upkeep").notNull().default(false),
  leadTimeDays: integer("lead_time_days"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  configId: uuid("config_id").references(() => todoConfigs.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  priority: integer("priority").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // PG `date` (no time-of-day). Null for one-offs without a scheduled date.
  dueDate: date("due_date"),
  isUpkeep: boolean("is_upkeep").notNull().default(false),
  leadTimeDays: integer("lead_time_days"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").$type<TagColor>().notNull().default("gray"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const todoTags = pgTable(
  "todo_tags",
  {
    todoId: uuid("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.todoId, table.tagId] })],
);
