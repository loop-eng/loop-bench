import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  handleRequest,
  clearStore,
  setMaxFileSize,
  getMaxFileSize,
  UPLOAD_DIR,
} from "../repo/src/server.js";

function createMockReq(
  method: string,
  url: string,
  body: Buffer | string | null,
  headers: Record<string, string> = {}
): http.IncomingMessage {
  const { Readable } = require("node:stream");
  const readable = new Readable();
  if (body !== null) {
    readable.push(typeof body === "string" ? Buffer.from(body) : body);
  }
  readable.push(null);
  readable.method = method;
  readable.url = url;
  readable.headers = { host: "localhost:3000", ...headers };
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

function buildMultipartBody(
  filename: string,
  content: Buffer,
  boundary: string
): Buffer {
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([header, content, footer]);
}

describe("POST /upload", () => {
  const boundary = "----TestBoundary123";
  let originalMaxSize: number;

  beforeEach(() => {
    clearStore();
    originalMaxSize = getMaxFileSize();
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    setMaxFileSize(originalMaxSize);
    // Clean up uploaded files
    if (fs.existsSync(UPLOAD_DIR)) {
      for (const file of fs.readdirSync(UPLOAD_DIR)) {
        fs.unlinkSync(path.join(UPLOAD_DIR, file));
      }
    }
  });

  it("accepts a file upload and saves it", async () => {
    const fileContent = Buffer.from("Hello, this is test file content!");
    const body = buildMultipartBody("test.txt", fileContent, boundary);
    const req = createMockReq("POST", "/upload", body, {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(200);
    const parsed = JSON.parse(res._body);
    expect(parsed.success).toBe(true);
  });

  it("rejects request without multipart content-type", async () => {
    const req = createMockReq("POST", "/upload", "some data", {
      "content-type": "application/json",
    });
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(400);
    const parsed = JSON.parse(res._body);
    expect(parsed.success).toBe(false);
  });

  it("rejects request with text/plain content-type", async () => {
    const req = createMockReq("POST", "/upload", "some data", {
      "content-type": "text/plain",
    });
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(400);
  });

  it("enforces file size limit", async () => {
    // Set a very small limit
    setMaxFileSize(50);
    const fileContent = Buffer.alloc(200, "x");
    const body = buildMultipartBody("big.bin", fileContent, boundary);
    const req = createMockReq("POST", "/upload", body, {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    await handleRequest(req, res);
    expect(res._statusCode).toBe(413);
    const parsed = JSON.parse(res._body);
    expect(parsed.success).toBe(false);
  });

  it("existing JSON endpoints still work after upload feature", async () => {
    // POST /api/data
    const postBody = JSON.stringify({ key: "test", value: "data" });
    const postReq = createMockReq("POST", "/api/data", postBody, {
      "content-type": "application/json",
    });
    const postRes = createMockRes();
    await handleRequest(postReq, postRes);
    expect(postRes._statusCode).toBe(201);

    // GET /api/data
    const getReq = createMockReq("GET", "/api/data", null);
    const getRes = createMockRes();
    await handleRequest(getReq, getRes);
    expect(getRes._statusCode).toBe(200);
  });
});

describe("Streaming implementation check", () => {
  it("server.ts uses pipe, createWriteStream, or on('data') for streaming", () => {
    const serverPath = path.join(__dirname, "..", "repo", "src", "server.ts");
    const source = fs.readFileSync(serverPath, "utf-8");
    const usesStreaming =
      source.includes(".pipe(") ||
      source.includes("createWriteStream") ||
      (source.includes('.on("data"') || source.includes(".on('data'"));
    expect(usesStreaming).toBe(true);
  });

  it("server.ts does NOT buffer entire upload into a single variable", () => {
    const serverPath = path.join(__dirname, "..", "repo", "src", "server.ts");
    const source = fs.readFileSync(serverPath, "utf-8");
    // The upload handler should not collect all chunks into an array
    // We check that the /upload route uses streaming, not the JSON parser
    // This is a heuristic: if they use createWriteStream or pipe, they're streaming
    const usesStreamWrite =
      source.includes("createWriteStream") || source.includes(".pipe(");
    expect(usesStreamWrite).toBe(true);
  });
});
