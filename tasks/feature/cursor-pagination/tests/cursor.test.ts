import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../repo/src/api.js";

describe("Cursor-Based Pagination", () => {
  it("returns limited results with limit param", async () => {
    const res = await request(app).get("/api/posts?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(10);
  });

  it("returns a next_cursor when more results exist", async () => {
    const res = await request(app).get("/api/posts?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.next_cursor).toBeDefined();
    expect(typeof res.body.next_cursor).toBe("string");
  });

  it("second page returns different results using cursor", async () => {
    const page1 = await request(app).get("/api/posts?limit=10");
    expect(page1.body.next_cursor).toBeDefined();

    const page2 = await request(app).get(
      `/api/posts?limit=10&cursor=${page1.body.next_cursor}`
    );
    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBe(10);

    // Pages should have different items
    const page1Ids = page1.body.data.map((p: any) => p.id);
    const page2Ids = page2.body.data.map((p: any) => p.id);
    expect(page1Ids).not.toEqual(page2Ids);
  });

  it("can paginate through the entire dataset", async () => {
    const allIds: number[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < 10; page++) {
      const url = cursor
        ? `/api/posts?limit=10&cursor=${cursor}`
        : "/api/posts?limit=10";
      const res = await request(app).get(url);
      expect(res.status).toBe(200);

      allIds.push(...res.body.data.map((p: any) => p.id));
      cursor = res.body.next_cursor;

      if (!cursor) break;
    }

    expect(allIds.length).toBe(50);
    // All IDs should be unique
    expect(new Set(allIds).size).toBe(50);
  });

  it("last page has no next_cursor", async () => {
    let cursor: string | undefined;

    // Navigate to the last page
    for (let page = 0; page < 10; page++) {
      const url = cursor
        ? `/api/posts?limit=10&cursor=${cursor}`
        : "/api/posts?limit=10";
      const res = await request(app).get(url);

      if (!res.body.next_cursor) {
        // This is the last page - no next_cursor
        expect(res.body.next_cursor).toBeUndefined();
        return;
      }
      cursor = res.body.next_cursor;
    }

    // Should have reached last page within 10 iterations
    expect.unreachable("Should have found last page");
  });

  it("default limit still returns all posts when no limit specified", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(50);
    expect(res.body.total).toBe(50);
  });

  it("author filter works with pagination", async () => {
    const res = await request(app).get("/api/posts?author=Alice&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    expect(res.body.data.every((p: any) => p.author === "Alice")).toBe(true);
  });

  it("single post endpoint still works", async () => {
    const res = await request(app).get("/api/posts/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });
});
