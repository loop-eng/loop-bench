import { describe, it, expect, beforeEach } from "vitest";
import http from "node:http";
import {
  handleRequest,
  setDependencyAvailable,
  clearItems,
} from "../repo/src/server.js";

function createMockReq(method: string, url: string, body?: string): http.IncomingMessage {
  const { Readable } = require("node:stream");
  const readable = new Readable();
  readable.push(body ?? null);
  readable.push(null);
  readable.method = method;
  readable.url = url;
  readable.headers = { host: "localhost:3000" };
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

describe("/health endpoint", () => {
  it("returns 200 status code", async () => {
    const req = createMockReq("GET", "/health");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(200);
  });

  it("returns JSON with status field", async () => {
    const req = createMockReq("GET", "/health");
    const res = createMockRes();
    await handleRequest(req, res);
    const body = JSON.parse(res._body);
    expect(body).toHaveProperty("status");
    expect(typeof body.status).toBe("string");
  });

  it("returns ok status regardless of dependencies", async () => {
    setDependencyAvailable(false);
    const req = createMockReq("GET", "/health");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(200);
    setDependencyAvailable(true);
  });
});

describe("/ready endpoint", () => {
  beforeEach(() => {
    setDependencyAvailable(true);
  });

  it("returns 200 when dependencies are available", async () => {
    const req = createMockReq("GET", "/ready");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(200);
  });

  it("returns JSON with status field when ready", async () => {
    const req = createMockReq("GET", "/ready");
    const res = createMockRes();
    await handleRequest(req, res);
    const body = JSON.parse(res._body);
    expect(body).toHaveProperty("status");
  });

  it("returns 503 when dependencies are down", async () => {
    setDependencyAvailable(false);
    const req = createMockReq("GET", "/ready");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(503);
    setDependencyAvailable(true);
  });

  it("returns JSON with status field when not ready", async () => {
    setDependencyAvailable(false);
    const req = createMockReq("GET", "/ready");
    const res = createMockRes();
    await handleRequest(req, res);
    const body = JSON.parse(res._body);
    expect(body).toHaveProperty("status");
    expect(body.status).not.toBe("ok");
    setDependencyAvailable(true);
  });
});
