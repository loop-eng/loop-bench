import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../repo/src/server.js";

describe("Rate Limiter Middleware", () => {
  it("allows requests under the limit", async () => {
    // Should be able to make at least a few requests without hitting the limit
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/api/items");
      expect(res.status).toBe(200);
    }
  });

  it("returns 429 after exceeding the rate limit", async () => {
    // Make many requests rapidly — should eventually get 429
    const responses: number[] = [];
    for (let i = 0; i < 150; i++) {
      const res = await request(app).get("/api/items");
      responses.push(res.status);
    }
    expect(responses).toContain(429);
  });

  it("429 response includes appropriate error message", async () => {
    // Exhaust the limit first
    for (let i = 0; i < 150; i++) {
      await request(app).get("/api/items");
    }
    const res = await request(app).get("/api/items");
    if (res.status === 429) {
      expect(res.body).toHaveProperty("error");
    }
  });

  it("rate limiter is applied per-route (POST also limited)", async () => {
    const responses: number[] = [];
    for (let i = 0; i < 150; i++) {
      const res = await request(app)
        .post("/api/items")
        .send({ name: `Item ${i}`, category: "test" });
      responses.push(res.status);
    }
    // Should see 429 among the responses
    expect(responses).toContain(429);
  });

  it("existing endpoint tests still pass (items list)", async () => {
    const res = await request(app).get("/api/items");
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("existing endpoint tests still pass (health)", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
