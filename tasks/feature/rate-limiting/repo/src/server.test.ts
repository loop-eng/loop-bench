import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./server.js";

describe("GET /api/items", () => {
  it("returns all items", async () => {
    const res = await request(app).get("/api/items");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.total).toBe(5);
  });
});

describe("GET /api/items/:id", () => {
  it("returns a single item by id", async () => {
    const res = await request(app).get("/api/items/1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Widget A");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/items/999");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/items", () => {
  it("creates a new item", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "New Item", category: "test" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("New Item");
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/api/items").send({ name: "Solo" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/health", () => {
  it("returns health status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
