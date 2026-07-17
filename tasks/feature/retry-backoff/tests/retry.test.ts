import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient, ApiError } from "../repo/src/client.js";

describe("Retry with Exponential Backoff", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockFetchSequence(
    responses: Array<{ status: number; data: unknown }>
  ) {
    const mockFn = global.fetch as ReturnType<typeof vi.fn>;
    for (const r of responses) {
      const headersMap = new Map<string, string>();
      mockFn.mockResolvedValueOnce({
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        json: () => Promise.resolve(r.data),
        headers: {
          forEach: (cb: (value: string, key: string) => void) => {
            headersMap.forEach((v, k) => cb(v, k));
          },
        },
      });
    }
  }

  it("retries on 500 and eventually succeeds", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([
      { status: 500, data: { error: "Server error" } },
      { status: 500, data: { error: "Server error" } },
      { status: 200, data: { id: 1, name: "Success" } },
    ]);

    const res = await client.get("/users/1");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 1, name: "Success" });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400 client errors", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([
      { status: 400, data: { error: "Bad request" } },
    ]);

    await expect(client.get("/bad")).rejects.toThrow(ApiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 404 client errors", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([
      { status: 404, data: { error: "Not found" } },
    ]);

    await expect(client.get("/missing")).rejects.toThrow(ApiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting max retries", async () => {
    const client = new ApiClient("https://api.example.com");
    // Default max retries should be at most around 3-5, so 10 failures should exhaust it
    mockFetchSequence(
      Array.from({ length: 10 }, () => ({
        status: 503,
        data: { error: "Service unavailable" },
      }))
    );

    await expect(client.get("/flaky")).rejects.toThrow(ApiError);
    // Should have retried some number of times but NOT 10
    const callCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCount).toBeGreaterThan(1);
    expect(callCount).toBeLessThanOrEqual(6);
  });

  it("retries on 502 Bad Gateway", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([
      { status: 502, data: { error: "Bad gateway" } },
      { status: 200, data: { ok: true } },
    ]);

    const res = await client.get("/gateway");
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 Service Unavailable", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([
      { status: 503, data: { error: "Service unavailable" } },
      { status: 200, data: { ok: true } },
    ]);

    const res = await client.get("/service");
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("successful GET request still works (no regression)", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([{ status: 200, data: { id: 1, name: "Test" } }]);

    const res = await client.get("/users/1");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 1, name: "Test" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("successful POST request still works (no regression)", async () => {
    const client = new ApiClient("https://api.example.com");
    mockFetchSequence([{ status: 201, data: { id: 2, name: "Created" } }]);

    const res = await client.post("/users", { name: "Created" });
    expect(res.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
