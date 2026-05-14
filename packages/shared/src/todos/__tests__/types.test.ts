import { describe, it, expect } from "vitest";
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
} from "../types.js";

describe("TodoSchema", () => {
  it("parses a valid todo", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Buy groceries",
      completed: false,
      createdAt: "2025-01-01T00:00:00Z",
    };

    const todo = TodoSchema.parse(input);

    expect(todo.title).toBe("Buy groceries");
    expect(todo.completed).toBe(false);
    expect(todo.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty title", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "",
      completed: false,
      createdAt: "2025-01-01T00:00:00Z",
    };

    expect(() => TodoSchema.parse(input)).toThrow();
  });
});

describe("CreateTodoSchema", () => {
  it("parses a valid create payload", () => {
    const result = CreateTodoSchema.parse({ title: "Hello" });
    expect(result.title).toBe("Hello");
    expect(result).not.toHaveProperty("id");
  });

  it("rejects missing title", () => {
    expect(() => CreateTodoSchema.parse({})).toThrow();
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
