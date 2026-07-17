import { describe, it, expect, beforeEach } from "vitest";
import http from "node:http";
import {
  addItem,
  clearItems,
  getItems,
  getItem,
  deleteItem,
  handleRequest,
} from "./server.js";

// Helper to create mock req/res for testing handleRequest
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

describe("Item CRUD operations", () => {
  beforeEach(() => {
    clearItems();
  });

  it("addItem and getItems", () => {
    addItem({ id: "1", name: "Widget", price: 9.99 });
    expect(getItems()).toHaveLength(1);
    expect(getItems()[0].name).toBe("Widget");
  });

  it("getItem returns item by id", () => {
    addItem({ id: "2", name: "Gadget", price: 19.99 });
    expect(getItem("2")?.name).toBe("Gadget");
  });

  it("getItem returns undefined for missing id", () => {
    expect(getItem("nonexistent")).toBeUndefined();
  });

  it("deleteItem removes item", () => {
    addItem({ id: "3", name: "Doohickey", price: 5.0 });
    expect(deleteItem("3")).toBe(true);
    expect(getItem("3")).toBeUndefined();
  });

  it("deleteItem returns false for missing item", () => {
    expect(deleteItem("nonexistent")).toBe(false);
  });
});

describe("HTTP handler", () => {
  beforeEach(() => {
    clearItems();
  });

  it("GET /items returns empty array", async () => {
    const req = createMockReq("GET", "/items");
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(200);
    expect(JSON.parse(res._body)).toEqual({ items: [] });
  });

  it("POST /items creates item", async () => {
    const body = JSON.stringify({ id: "1", name: "Widget", price: 9.99 });
    const req = createMockReq("POST", "/items", body);
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(201);
    expect(getItems()).toHaveLength(1);
  });

  it("GET /items/:id returns 404 for missing", async () => {
    const req = createMockReq("GET", "/items/999");
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
