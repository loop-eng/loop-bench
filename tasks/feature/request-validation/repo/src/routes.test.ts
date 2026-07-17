import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./routes.js";

describe("GET /api/users", () => {
  it("returns all users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(3);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });
});

describe("GET /api/users/:id", () => {
  it("returns a single user", async () => {
    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alice Johnson");
  });

  it("returns 404 for unknown user", async () => {
    const res = await request(app).get("/api/users/999");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/users", () => {
  it("creates a new user", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Diana Prince", email: "diana@example.com", age: 28, role: "user" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Diana Prince");
    expect(res.body.id).toBeDefined();
  });
});

describe("PUT /api/users/:id", () => {
  it("updates an existing user", async () => {
    const res = await request(app)
      .put("/api/users/2")
      .send({ name: "Bob Updated" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Bob Updated");
  });

  it("returns 404 for unknown user", async () => {
    const res = await request(app)
      .put("/api/users/999")
      .send({ name: "Ghost" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/users/:id", () => {
  it("deletes an existing user", async () => {
    // Create one to delete
    const created = await request(app)
      .post("/api/users")
      .send({ name: "Temp User", email: "temp@example.com", age: 20, role: "user" });

    const res = await request(app).delete(`/api/users/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBeDefined();
  });
});
