import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./api.js";

describe("GET /api/posts", () => {
  it("returns all posts", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(50);
    expect(res.body.total).toBe(50);
  });

  it("filters by author", async () => {
    const res = await request(app).get("/api/posts?author=Alice");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(10);
    expect(res.body.data.every((p: any) => p.author === "Alice")).toBe(true);
  });

  it("returns posts with correct shape", async () => {
    const res = await request(app).get("/api/posts");
    const post = res.body.data[0];
    expect(post).toHaveProperty("id");
    expect(post).toHaveProperty("title");
    expect(post).toHaveProperty("author");
    expect(post).toHaveProperty("createdAt");
    expect(post).toHaveProperty("tags");
  });
});

describe("GET /api/posts/:id", () => {
  it("returns a single post", async () => {
    const res = await request(app).get("/api/posts/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("returns 404 for unknown post", async () => {
    const res = await request(app).get("/api/posts/999");
    expect(res.status).toBe(404);
  });
});
