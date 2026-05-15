import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { firstDueDate, toIsoDate, type Schedule, type TagColor } from "shared";
import type * as schema from "./schema.js";
import { todoConfigs, todos, tags, todoTags } from "../todos/schema.js";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

interface InitialTag {
  name: string;
  color: TagColor;
}

const TAG_SOCIAL = "social";
const TAG_FINANCES = "finances";

const INITIAL_TAGS = {
  [TAG_SOCIAL]: { name: "Social", color: "#ec4899" },
  [TAG_FINANCES]: { name: "Finances", color: "#22c55e" },
} as const satisfies Record<string, InitialTag>;

type TagKey = keyof typeof INITIAL_TAGS;

interface RecurringTodo {
  title: string;
  priority: 1 | 2 | 3 | 4;
  schedule: Schedule;
  isUpkeep?: boolean;
  leadTimeDays?: number;
  dueAfterDays?: number;
  tagIds?: TagKey[];
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

  const [instance] = await db.insert(todos).values({
    configId: config!.id,
    title: todo.title,
    priority: todo.priority,
    dueDate: toIsoDate(dueDate),
    isUpkeep: todo.isUpkeep ?? false,
    leadTimeDays: todo.leadTimeDays ?? null,
  }).returning();

  return { config: config!, todo: instance! };
}

interface OneOffTodo {
  title: string;
  priority: 1 | 2 | 3 | 4;
  dueAfterDays?: number;
  leadTimeDays?: number;
  tagIds?: TagKey[];
}

const INITIAL_ONE_OFF_TODOS: OneOffTodo[] = [
  { title: "Kubernetes learning project", priority: 3 },
  { title: "Sell wobble chair", priority: 4 },
  { title: "Make slideshow", priority: 1, dueAfterDays: 14, leadTimeDays: 21 },
  { title: "Check Slack for job postings", priority: 2, dueAfterDays: 7, leadTimeDays: 3 },
  { title: "Reset RBC debit card PIN", priority: 2, dueAfterDays: 14, leadTimeDays: 21 },
];

const INITIAL_TODOS: RecurringTodo[] = [
  {
    title: "Pay rent",
    priority: 1,
    schedule: { type: "day_of_month", dayOfMonth: 12 },
    isUpkeep: true,
    leadTimeDays: 1,
    tagIds: [TAG_FINANCES],
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
    title: "Pay credit cards",
    priority: 2,
    schedule: { type: "interval", intervalDays: 20 },
    isUpkeep: true,
    leadTimeDays: 5,
    dueAfterDays: 3,
  },
  {
    title: "Buy birthday gift for mom",
    priority: 2,
    schedule: { type: "day_of_year", month: 6, dayOfMonth: 17 },
    leadTimeDays: 20,
    tagIds: [TAG_SOCIAL],
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
  const tagIdsByKey = new Map<TagKey, string>();
  for (const [key, tag] of Object.entries(INITIAL_TAGS)) {
    const [row] = await db.insert(tags).values(tag).returning();
    tagIdsByKey.set(key as TagKey, row!.id);
  }

  for (const todo of INITIAL_TODOS) {
    const { todo: instance } = await createRecurringTodo(db, todo);
    if (todo.tagIds) {
      for (const tagKey of todo.tagIds) {
        await db.insert(todoTags).values({ todoId: instance.id, tagId: tagIdsByKey.get(tagKey)! });
      }
    }
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
