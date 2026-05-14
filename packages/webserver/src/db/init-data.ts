import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { firstDueDate, toIsoDate, type Schedule } from "shared";
import type * as schema from "./schema.js";
import { todoConfigs, todos } from "../todos/schema.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

interface RecurringTodo {
  title: string;
  priority: 1 | 2 | 3 | 4;
  schedule: Schedule;
  isUpkeep?: boolean;
  leadTimeDays?: number;
  dueAfterDays?: number;
}

async function createRecurringTodo(db: Database, todo: RecurringTodo) {
  const [config] = await db
    .insert(todoConfigs)
    .values({
      title: todo.title,
      priority: todo.priority,
      schedule: todo.schedule,
      isUpkeep: todo.isUpkeep ?? false,
      leadTimeDays: todo.leadTimeDays ?? null,
    })
    .returning();

  const now = new Date();
  let dueDate: Date;
  if (todo.dueAfterDays != null) {
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    todayUtc.setUTCDate(todayUtc.getUTCDate() + todo.dueAfterDays);
    dueDate = todayUtc;
  } else {
    dueDate = firstDueDate(todo.schedule, now);
  }

  await db.insert(todos).values({
    configId: config!.id,
    title: todo.title,
    priority: todo.priority,
    dueDate: toIsoDate(dueDate),
    leadTimeDays: todo.leadTimeDays ?? null,
  });

  return config!;
}

interface OneOffTodo {
  title: string;
  priority: 1 | 2 | 3 | 4;
  dueAfterDays?: number;
  leadTimeDays?: number;
}

const INITIAL_ONE_OFF_TODOS: OneOffTodo[] = [
  { title: "Kubernetes learning project", priority: 3 },
  { title: "Sell wobble chair", priority: 4 },
  { title: "Make slideshow", priority: 1, dueAfterDays: 14, leadTimeDays: 21 },
];

const INITIAL_TODOS: RecurringTodo[] = [
  {
    title: "Pay rent",
    priority: 1,
    schedule: { type: "day_of_month", dayOfMonth: 12 },
    isUpkeep: true,
    leadTimeDays: 1,
  },
  {
    title: "Trim beard",
    priority: 2,
    schedule: { type: "interval", intervalDays: 4 },
    isUpkeep: true,
    leadTimeDays: 1,
    dueAfterDays: 1,
  },
  {
    title: "Replace water filter",
    priority: 4,
    schedule: { type: "interval", intervalDays: 80 },
    isUpkeep: true,
    leadTimeDays: 10,
    dueAfterDays: 6,
  },
  {
    title: "Buy birthday gift for mom",
    priority: 2,
    schedule: { type: "day_of_year", month: 6, dayOfMonth: 17 },
    leadTimeDays: 20,
  },
  {
    title: "Water plants",
    priority: 2,
    schedule: { type: "interval", intervalDays: 14 },
    isUpkeep: true,
    leadTimeDays: 7,
    dueAfterDays: 3,
  },
];

export async function seedInitialTodos(db: Database) {
  for (const todo of INITIAL_TODOS) {
    await createRecurringTodo(db, todo);
  }
  for (const todo of INITIAL_ONE_OFF_TODOS) {
    let dueDate: string | undefined;
    if (todo.dueAfterDays != null) {
      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      todayUtc.setUTCDate(todayUtc.getUTCDate() + todo.dueAfterDays);
      dueDate = toIsoDate(todayUtc);
    }
    await db.insert(todos).values({
      title: todo.title,
      priority: todo.priority,
      ...(dueDate != null && { dueDate }),
      ...(todo.leadTimeDays != null && { leadTimeDays: todo.leadTimeDays }),
    });
  }
  return INITIAL_TODOS.length + INITIAL_ONE_OFF_TODOS.length;
}
