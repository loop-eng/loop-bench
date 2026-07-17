import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../repo/src/routes.js";

describe("Request Validation Middleware", () => {
  describe("POST /api/users validation", () => {
    it("rejects missing required name field", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ email: "test@example.com", age: 25 });

      expect(res.status).toBe(400);
      expect(res.body.errors || res.body.error).toBeDefined();
    });

    it("rejects missing required email field", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ name: "Test User", age: 25 });

      expect(res.status).toBe(400);
      expect(res.body.errors || res.body.error).toBeDefined();
    });

    it("rejects wrong type for age (string instead of number)", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ name: "Test User", email: "test@example.com", age: "twenty" });

      expect(res.status).toBe(400);
      expect(res.body.errors || res.body.error).toBeDefined();
    });

    it("rejects invalid role value", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({
          name: "Test User",
          email: "test@example.com",
          age: 25,
          role: "superadmin",
        });

      expect(res.status).toBe(400);
      expect(res.body.errors || res.body.error).toBeDefined();
    });

    it("accepts valid complete payload", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({
          name: "Valid User",
          email: "valid@example.com",
          age: 30,
          role: "user",
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Valid User");
    });

    it("error response includes field-level details", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ age: "not-a-number" });

      expect(res.status).toBe(400);
      const body = res.body;
      // Should have some structured error info — either errors array or error string mentioning fields
      const hasFieldInfo =
        (Array.isArray(body.errors) && body.errors.length > 0) ||
        (typeof body.error === "string" && body.error.length > 10);
      expect(hasFieldInfo).toBe(true);
    });
  });

  describe("PUT /api/users/:id validation", () => {
    it("rejects wrong type for age on update", async () => {
      const res = await request(app)
        .put("/api/users/1")
        .send({ age: "old" });

      expect(res.status).toBe(400);
    });

    it("rejects invalid role on update", async () => {
      const res = await request(app)
        .put("/api/users/1")
        .send({ role: "supreme-leader" });

      expect(res.status).toBe(400);
    });

    it("accepts valid partial update", async () => {
      const res = await request(app)
        .put("/api/users/1")
        .send({ name: "Alice Updated" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alice Updated");
    });
  });

  describe("Non-validated routes still work", () => {
    it("GET /api/users returns list", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
    });

    it("GET /api/users/:id returns single user", async () => {
      const res = await request(app).get("/api/users/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it("DELETE /api/users/:id works without body validation", async () => {
      // Create a user first
      const created = await request(app)
        .post("/api/users")
        .send({ name: "To Delete", email: "del@example.com", age: 20, role: "user" });

      const res = await request(app).delete(`/api/users/${created.body.id}`);
      expect(res.status).toBe(200);
    });
  });
});
