import { describe, it, expect } from "vitest";
import { createUser, UserRole } from "./user.js";

describe("createUser", () => {
  it("should create a user with default role", () => {
    const user = createUser({
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
    });

    expect(user.id).toBe("u1");
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(user.role).toBe(UserRole.Customer);
    expect(user.orders).toEqual([]);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it("should create a user with specified role", () => {
    const user = createUser({
      id: "u2",
      name: "Bob",
      email: "bob@example.com",
      role: UserRole.Admin,
    });

    expect(user.role).toBe(UserRole.Admin);
  });
});
