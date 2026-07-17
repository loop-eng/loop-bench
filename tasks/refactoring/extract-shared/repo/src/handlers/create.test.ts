import { describe, it, expect } from "vitest";
import { createUser } from "./create.js";

describe("createUser", () => {
  it("should create a user with valid inputs", async () => {
    const result = await createUser({
      email: "alice@example.com",
      name: "Alice Smith",
      role: "admin",
      password: "Secure1Pass",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe("alice@example.com");
      expect(result.user.name).toBe("Alice Smith");
      expect(result.user.role).toBe("admin");
      expect(result.user.id).toBeDefined();
      expect(result.user.createdAt).toBeInstanceOf(Date);
    }
  });

  it("should return an error for invalid email", async () => {
    const result = await createUser({
      email: "invalid-email",
      name: "Alice Smith",
      role: "admin",
      password: "Secure1Pass",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("Email must contain an @ symbol");
    }
  });

  it("should return an error for empty email", async () => {
    const result = await createUser({
      email: "",
      name: "Alice Smith",
      role: "admin",
      password: "Secure1Pass",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("Email is required");
    }
  });

  it("should return an error for invalid name", async () => {
    const result = await createUser({
      email: "alice@example.com",
      name: "A",
      role: "admin",
      password: "Secure1Pass",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain("Name must be at least 2 characters");
    }
  });

  it("should return an error for name with invalid characters", async () => {
    const result = await createUser({
      email: "alice@example.com",
      name: "Alice123",
      role: "admin",
      password: "Secure1Pass",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain(
        "Name must contain only letters, spaces, and hyphens"
      );
    }
  });

  it("should return an error for invalid password", async () => {
    const result = await createUser({
      email: "alice@example.com",
      name: "Alice Smith",
      role: "admin",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain(
        "Password must be at least 8 characters"
      );
    }
  });

  it("should return an error for password without uppercase", async () => {
    const result = await createUser({
      email: "alice@example.com",
      name: "Alice Smith",
      role: "admin",
      password: "nouppercase1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    }
  });

  it("should return multiple validation errors together", async () => {
    const result = await createUser({
      email: "",
      name: "",
      role: "admin",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors).toContain("Email is required");
      expect(result.errors).toContain("Name is required");
      expect(result.errors).toContain(
        "Password must be at least 8 characters"
      );
    }
  });
});
