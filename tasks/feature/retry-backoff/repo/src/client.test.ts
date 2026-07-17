import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient, ApiError } from "./client.js";

describe("ApiClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(status: number, data: unknown, headers: Record<string, string> = {}) {
    const headerMap = new Map(Object.entries(headers));
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      headers: {
        forEach: (cb: (value: string, key: string) => void) => {
          headerMap.forEach((v, k) => cb(v, k));
        },
      },
    });
  }

  it("makes a GET request and returns data", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetch(200, { id: 1, name: "Test" });

    const res = await client.get("/users/1");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 1, name: "Test" });
  });

  it("makes a POST request with body", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetch(201, { id: 2, name: "New User" });

    const res = await client.post("/users", { name: "New User" });
    expect(res.status).toBe(201);
    expect(res.data).toEqual({ id: 2, name: "New User" });
  });

  it("throws ApiError on 404", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetch(404, { error: "Not found" });

    await expect(client.get("/users/999")).rejects.toThrow(ApiError);
  });

  it("throws ApiError on 500", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetch(500, { error: "Internal server error" });

    await expect(client.get("/status")).rejects.toThrow(ApiError);
  });

  it("includes custom headers", async () => {
    const client = new ApiClient("https://api.example.com", {
      Authorization: "Bearer token123",
    });
    mockFetch(200, { ok: true });

    await client.get("/protected");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/protected",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123",
        }),
      })
    );
  });

  it("strips trailing slash from base URL", async () => {
    const client = new ApiClient("https://api.example.com/");
    mockFetch(200, {});

    await client.get("/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.anything()
    );
  });
});
