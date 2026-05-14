import { describe, it, expect } from "vitest";
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  PrioritySchema,
} from "../types.js";
import { ScheduleSchema } from "../schedule.js";

describe("PrioritySchema", () => {
  it("accepts valid priorities 1-4", () => {
    expect(PrioritySchema.parse(1)).toBe(1);
    expect(PrioritySchema.parse(2)).toBe(2);
    expect(PrioritySchema.parse(3)).toBe(3);
    expect(PrioritySchema.parse(4)).toBe(4);
  });

  it("rejects invalid priorities", () => {
    expect(() => PrioritySchema.parse(0)).toThrow();
    expect(() => PrioritySchema.parse(5)).toThrow();
  });
});

describe("TodoSchema", () => {
  const base = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    configId: null,
    title: "Buy groceries",
    priority: 2,
    completed: false,
    completedAt: null,
    dueDate: null,
    createdAt: "2025-01-01T00:00:00Z",
    schedule: null,
    isUpkeep: false,
    leadTimeDays: null,
  };

  it("parses a valid one-off todo", () => {
    const todo = TodoSchema.parse(base);
    expect(todo.title).toBe("Buy groceries");
    expect(todo.priority).toBe(2);
    expect(todo.configId).toBeNull();
    expect(todo.schedule).toBeNull();
    expect(todo.createdAt).toBeInstanceOf(Date);
  });

  it("parses a recurring todo with schedule + due date", () => {
    const todo = TodoSchema.parse({
      ...base,
      configId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
      dueDate: "2025-06-12",
      schedule: { type: "day_of_month", dayOfMonth: 12 },
    });
    expect(todo.configId).toBe("b1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(todo.dueDate).toBe("2025-06-12");
    expect(todo.schedule?.type).toBe("day_of_month");
  });

  it("rejects a malformed due date", () => {
    expect(() => TodoSchema.parse({ ...base, dueDate: "06/12/2025" })).toThrow();
  });

  it("rejects an empty title", () => {
    expect(() => TodoSchema.parse({ ...base, title: "" })).toThrow();
  });

  it("rejects an invalid priority", () => {
    expect(() => TodoSchema.parse({ ...base, priority: 5 })).toThrow();
  });
});

describe("CreateTodoSchema", () => {
  it("parses a valid one-off create payload", () => {
    const result = CreateTodoSchema.parse({ title: "Hello", priority: 1 });
    expect(result.title).toBe("Hello");
    expect(result.priority).toBe(1);
    expect(result.schedule).toBeUndefined();
  });

  it("parses a recurring create payload", () => {
    const result = CreateTodoSchema.parse({
      title: "Water plants",
      priority: 3,
      schedule: { type: "interval", intervalDays: 5 },
    });
    expect(result.schedule).toEqual({ type: "interval", intervalDays: 5 });
  });

  it("rejects missing title", () => {
    expect(() => CreateTodoSchema.parse({ priority: 2 })).toThrow();
  });
});

describe("UpdateTodoSchema", () => {
  it("parses an update payload", () => {
    const result = UpdateTodoSchema.parse({
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      completed: true,
    });
    expect(result.completed).toBe(true);
  });

  it("accepts schedule: null to remove recurrence", () => {
    const result = UpdateTodoSchema.parse({
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      schedule: null,
    });
    expect(result.schedule).toBeNull();
  });

  it("rejects an empty payload", () => {
    expect(() =>
      UpdateTodoSchema.parse({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }),
    ).toThrow();
  });

  it("rejects a non-uuid id", () => {
    expect(() =>
      UpdateTodoSchema.parse({ id: "nope", completed: true }),
    ).toThrow();
  });
});

describe("ScheduleSchema", () => {
  it("accepts all four schedule types", () => {
    expect(ScheduleSchema.parse({ type: "interval", intervalDays: 5 })).toEqual({
      type: "interval",
      intervalDays: 5,
    });
    expect(ScheduleSchema.parse({ type: "day_of_week", dayOfWeek: 4 })).toEqual({
      type: "day_of_week",
      dayOfWeek: 4,
    });
    expect(
      ScheduleSchema.parse({ type: "day_of_month", dayOfMonth: 12 }),
    ).toEqual({ type: "day_of_month", dayOfMonth: 12 });
    expect(
      ScheduleSchema.parse({ type: "day_of_year", month: 5, dayOfMonth: 2 }),
    ).toEqual({ type: "day_of_year", month: 5, dayOfMonth: 2 });
  });

  it("rejects out-of-range fields", () => {
    expect(() => ScheduleSchema.parse({ type: "interval", intervalDays: 0 })).toThrow();
    expect(() => ScheduleSchema.parse({ type: "day_of_week", dayOfWeek: 7 })).toThrow();
    expect(() => ScheduleSchema.parse({ type: "day_of_month", dayOfMonth: 32 })).toThrow();
    expect(() =>
      ScheduleSchema.parse({ type: "day_of_year", month: 13, dayOfMonth: 1 }),
    ).toThrow();
  });

  it("rejects an unknown type", () => {
    expect(() => ScheduleSchema.parse({ type: "nope" })).toThrow();
  });
});
