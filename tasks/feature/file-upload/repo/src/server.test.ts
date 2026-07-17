import { describe, it, expect, beforeEach } from "vitest";
import http from "node:http";
import { handleRequest, clearStore } from "./server.js";

function createMockReq(method: string, url: string, body?: string): http.IncomingMessage {
  const { Readable } = require("node:stream");
  const readable = new Readable();
  readable.push(body ?? null);
  readable.push(null);
  readable.method = method;
  readable.url = url;
  readable.headers = { host: "localhost:3000", "content-type": "application/json" };
  return readable as http.IncomingMessage;
}

function createMockRes(): http.ServerResponse & { _statusCode: number; _body: string } {
  const { Writable } = require("node:stream");
  const writable = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void) {
      (writable as any)._body += chunk.toString();
      callback();
    },
  });
  (writable as any)._statusCode = 200;
  (writable as any)._body = "";
  (writable as any).writeHead = function (code: number, headers?: Record<string, string>) {
    (writable as any)._statusCode = code;
  };
  return writable as any;
}

describe("JSON API endpoints", () => {
  beforeEach(() => {
    clearStore();
  });

  it("GET /api/data returns empty store", async () => {
    const req = createMockReq("GET", "/api/data");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.success).toBe(true);
  });

  it("POST /api/data stores value", async () => {
    const body = JSON.stringify({ key: "test", value: "hello" });
    const req = createMockReq("POST", "/api/data", body);
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(201);
  });

  it("POST /api/data rejects missing key", async () => {
    const body = JSON.stringify({ value: "hello" });
    const req = createMockReq("POST", "/api/data", body);
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(400);
  });

  it("DELETE /api/data/:key removes value", async () => {
    // First store something
    const postBody = JSON.stringify({ key: "mykey", value: 42 });
    const postReq = createMockReq("POST", "/api/data", postBody);
    const postRes = createMockRes();
    await handleRequest(postReq, postRes);

    // Then delete
    const delReq = createMockReq("DELETE", "/api/data/mykey");
    const delRes = createMockRes();
    await handleRequest(delReq, delRes);
    expect(delRes._statusCode).toBe(200);
  });

  it("DELETE /api/data/:key returns 404 for missing", async () => {
    const req = createMockReq("DELETE", "/api/data/nonexistent");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(404);
  });

  it("unknown route returns 404", async () => {
    const req = createMockReq("GET", "/unknown");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(404);
  });
});
