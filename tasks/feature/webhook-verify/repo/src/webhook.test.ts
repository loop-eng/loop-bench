import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./webhook.js";

describe("POST /webhooks/events", () => {
  it("accepts a valid webhook event", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send({
        event: "order.created",
        timestamp: "2024-01-15T10:30:00Z",
        payload: { orderId: "abc123", amount: 99.99 },
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.eventId).toBeDefined();
  });

  it("rejects event without event field", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send({ payload: { data: "test" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing event");
  });

  it("handles event with minimal fields", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send({ event: "ping" });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});

describe("POST /webhooks/events/batch", () => {
  it("accepts batch of events", async () => {
    const res = await request(app)
      .post("/webhooks/events/batch")
      .send({
        events: [
          { event: "user.signup", payload: { userId: "u1" } },
          { event: "user.verified", payload: { userId: "u1" } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(2);
  });

  it("rejects non-array events", async () => {
    const res = await request(app)
      .post("/webhooks/events/batch")
      .send({ events: "not-array" });

    expect(res.status).toBe(400);
  });
});

describe("GET /webhooks/events", () => {
  it("returns list of received events", async () => {
    const res = await request(app).get("/webhooks/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(typeof res.body.total).toBe("number");
  });
});
