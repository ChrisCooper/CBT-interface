import { describe, it, expect } from "vitest";
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  PrioritySchema,
} from "../types.js";

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
  it("parses a valid todo", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Buy groceries",
      priority: 2,
      completed: false,
      createdAt: "2025-01-01T00:00:00Z",
    };

    const todo = TodoSchema.parse(input);

    expect(todo.title).toBe("Buy groceries");
    expect(todo.priority).toBe(2);
    expect(todo.completed).toBe(false);
    expect(todo.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty title", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "",
      priority: 3,
      completed: false,
      createdAt: "2025-01-01T00:00:00Z",
    };

    expect(() => TodoSchema.parse(input)).toThrow();
  });

  it("rejects an invalid priority", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Test",
      priority: 5,
      completed: false,
      createdAt: "2025-01-01T00:00:00Z",
    };

    expect(() => TodoSchema.parse(input)).toThrow();
  });
});

describe("CreateTodoSchema", () => {
  it("parses a valid create payload", () => {
    const result = CreateTodoSchema.parse({ title: "Hello", priority: 1 });
    expect(result.title).toBe("Hello");
    expect(result.priority).toBe(1);
    expect(result).not.toHaveProperty("id");
  });

  it("rejects missing title", () => {
    expect(() => CreateTodoSchema.parse({ priority: 2 })).toThrow();
  });

  it("rejects missing priority", () => {
    expect(() => CreateTodoSchema.parse({ title: "Hello" })).toThrow();
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

  it("rejects a non-uuid id", () => {
    expect(() =>
      UpdateTodoSchema.parse({ id: "nope", completed: true }),
    ).toThrow();
  });
});
