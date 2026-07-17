import { describe, it, expect } from "vitest";
import { getUserProfile } from "./user.js";

describe("getUserProfile", () => {
  it("returns user data for an existing user", () => {
    const result = getUserProfile("user-1");
    expect(result.status).toBe(200);
    expect(result.body.name).toBe("Alice Johnson");
    expect(result.body.email).toBe("alice@example.com");
    expect(result.body.role).toBe("admin");
  });

  it("returns correct data for another user", () => {
    const result = getUserProfile("user-2");
    expect(result.status).toBe(200);
    expect(result.body.name).toBe("Bob Smith");
  });
});
