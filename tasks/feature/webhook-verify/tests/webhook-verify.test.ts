import { describe, it, expect } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { app, WEBHOOK_SECRET } from "../repo/src/webhook.js";

function computeSignature(body: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("Webhook Signature Verification", () => {
  const validPayload = {
    event: "order.created",
    timestamp: "2024-01-15T10:30:00Z",
    payload: { orderId: "sig-test-001", amount: 49.99 },
  };

  it("accepts request with valid signature", async () => {
    const body = JSON.stringify(validPayload);
    const signature = computeSignature(body, WEBHOOK_SECRET);

    const res = await request(app)
      .post("/webhooks/events")
      .set("Content-Type", "application/json")
      .set("X-Signature-256", signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("rejects request with invalid signature", async () => {
    const body = JSON.stringify(validPayload);
    const badSignature = "sha256=" + "a".repeat(64);

    const res = await request(app)
      .post("/webhooks/events")
      .set("Content-Type", "application/json")
      .set("X-Signature-256", badSignature)
      .send(body);

    expect(res.status).toBe(401);
  });

  it("rejects request with missing signature header", async () => {
    const res = await request(app)
      .post("/webhooks/events")
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  it("rejects request with wrong secret", async () => {
    const body = JSON.stringify(validPayload);
    const wrongSignature = computeSignature(body, "wrong-secret");

    const res = await request(app)
      .post("/webhooks/events")
      .set("Content-Type", "application/json")
      .set("X-Signature-256", wrongSignature)
      .send(body);

    expect(res.status).toBe(401);
  });

  it("rejects request with tampered body", async () => {
    const body = JSON.stringify(validPayload);
    const signature = computeSignature(body, WEBHOOK_SECRET);
    const tamperedBody = JSON.stringify({
      ...validPayload,
      payload: { orderId: "tampered", amount: 0.01 },
    });

    const res = await request(app)
      .post("/webhooks/events")
      .set("Content-Type", "application/json")
      .set("X-Signature-256", signature)
      .send(tamperedBody);

    expect(res.status).toBe(401);
  });

  it("batch endpoint also verifies signature", async () => {
    const batchPayload = {
      events: [
        { event: "user.signup", payload: { userId: "u1" } },
      ],
    };
    const body = JSON.stringify(batchPayload);
    const signature = computeSignature(body, WEBHOOK_SECRET);

    const res = await request(app)
      .post("/webhooks/events/batch")
      .set("Content-Type", "application/json")
      .set("X-Signature-256", signature)
      .send(body);

    expect(res.status).toBe(200);
  });

  it("batch endpoint rejects without signature", async () => {
    const res = await request(app)
      .post("/webhooks/events/batch")
      .send({
        events: [{ event: "test" }],
      });

    expect(res.status).toBe(401);
  });

  it("GET endpoint does not require signature", async () => {
    const res = await request(app).get("/webhooks/events");
    expect(res.status).toBe(200);
  });
});
