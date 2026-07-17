import { describe, it, expect } from "vitest";
import { getUserProfile } from "../repo/src/handlers/user.js";

describe("getUserProfile (hidden tests)", () => {
  it("returns 404 for a missing user", () => {
    const result = getUserProfile("nonexistent-user");
    expect(result.status).toBe(404);
  });

  it("does not crash for a missing user", () => {
    expect(() => getUserProfile("nonexistent-user")).not.toThrow();
  });

  it("returns 200 for a valid user", () => {
    const result = getUserProfile("user-1");
    expect(result.status).toBe(200);
    expect(result.body.name).toBe("Alice Johnson");
  });

  it("returns 404 for empty string userId", () => {
    const result = getUserProfile("");
    expect(result.status).toBe(404);
  });

  it("response body contains error message for missing user", () => {
    const result = getUserProfile("does-not-exist");
    expect(result.status).toBe(404);
    expect(result.body).toHaveProperty("error");
  });
});
