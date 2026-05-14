import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { firstDueDate, toIsoDate, type Schedule } from "shared";
import type * as schema from "./schema.js";
import { todoConfigs, todos } from "../todos/schema.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

interface RecurringTodo {
  title: string;
  priority: 1 | 2 | 3 | 4;
  schedule: Schedule;
  leadTimeDays?: number;
}

async function createRecurringTodo(db: Database, todo: RecurringTodo) {
  const [config] = await db
    .insert(todoConfigs)
    .values({
      title: todo.title,
      priority: todo.priority,
      schedule: todo.schedule,
      leadTimeDays: todo.leadTimeDays ?? null,
    })
    .returning();

  const dueDate = firstDueDate(todo.schedule, new Date());

  await db.insert(todos).values({
    configId: config!.id,
    title: todo.title,
    priority: todo.priority,
    dueDate: toIsoDate(dueDate),
    leadTimeDays: todo.leadTimeDays ?? null,
  });

  return config!;
}

const INITIAL_TODOS: RecurringTodo[] = [
  {
    title: "Pay rent",
    priority: 1,
    schedule: { type: "day_of_month", dayOfMonth: 12 },
    leadTimeDays: 1,
  },
  {
    title: "Trim beard",
    priority: 4,
    schedule: { type: "interval", intervalDays: 4 },
  },
  {
    title: "Replace water filter",
    priority: 3,
    schedule: { type: "interval", intervalDays: 80 },
    leadTimeDays: 10,
  },
  {
    title: "Buy birthday gift for mom",
    priority: 2,
    schedule: { type: "day_of_year", month: 6, dayOfMonth: 17 },
    leadTimeDays: 20,
  },
  {
    title: "Water plants",
    priority: 3,
    schedule: { type: "interval", intervalDays: 14 },
  },
];

export async function seedInitialTodos(db: Database) {
  for (const todo of INITIAL_TODOS) {
    await createRecurringTodo(db, todo);
  }
  return INITIAL_TODOS.length;
}
