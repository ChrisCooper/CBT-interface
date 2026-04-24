import { describe, it, expect } from "vitest";
import { UserSchema, CreatePostSchema } from "../types.js";

describe("UserSchema", () => {
  it("parses a valid user", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "Alice",
      email: "alice@example.com",
      createdAt: "2025-01-01T00:00:00Z",
    };

    const user = UserSchema.parse(input);

    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid email", () => {
    const input = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "Bad",
      email: "not-an-email",
      createdAt: "2025-01-01T00:00:00Z",
    };

    expect(() => UserSchema.parse(input)).toThrow();
  });

  it("rejects a non-uuid id", () => {
    const input = {
      id: "123",
      name: "Bad",
      email: "ok@example.com",
      createdAt: "2025-01-01T00:00:00Z",
    };

    expect(() => UserSchema.parse(input)).toThrow();
  });
});

describe("CreatePostSchema", () => {
  it("parses a valid post creation payload", () => {
    const input = {
      title: "Hello World",
      content: "Some content",
      authorId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };

    const post = CreatePostSchema.parse(input);

    expect(post.title).toBe("Hello World");
    expect(post).not.toHaveProperty("id");
    expect(post).not.toHaveProperty("createdAt");
  });

  it("rejects a payload with missing title", () => {
    const input = {
      content: "Some content",
      authorId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };

    expect(() => CreatePostSchema.parse(input)).toThrow();
  });
});
