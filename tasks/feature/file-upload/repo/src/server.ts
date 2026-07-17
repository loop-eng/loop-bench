import http from "node:http";
import path from "node:path";
import fs from "node:fs";

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// Upload directory for saved files
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Maximum file size in bytes (default 10MB)
export let maxFileSizeBytes = 10 * 1024 * 1024;

export function setMaxFileSize(bytes: number): void {
  maxFileSizeBytes = bytes;
}

export function getMaxFileSize(): number {
  return maxFileSizeBytes;
}

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: ApiResponse
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Simple in-memory store for JSON data
const store: Map<string, unknown> = new Map();

export function clearStore(): void {
  store.clear();
}

export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const urlPath = url.pathname;
  const method = req.method ?? "GET";

  // GET /api/data
  if (method === "GET" && urlPath === "/api/data") {
    const entries = Object.fromEntries(store.entries());
    sendJson(res, 200, { success: true, data: entries });
    return;
  }

  // POST /api/data
  if (method === "POST" && urlPath === "/api/data") {
    try {
      const body = (await parseJsonBody(req)) as Record<string, unknown>;
      const key = body.key as string;
      const value = body.value;
      if (!key) {
        sendJson(res, 400, { success: false, error: "Missing key field" });
        return;
      }
      store.set(key, value);
      sendJson(res, 201, { success: true, message: `Stored key: ${key}` });
    } catch {
      sendJson(res, 400, { success: false, error: "Invalid request body" });
    }
    return;
  }

  // DELETE /api/data/:key
  if (method === "DELETE" && urlPath.startsWith("/api/data/")) {
    const key = urlPath.slice("/api/data/".length);
    if (store.delete(key)) {
      sendJson(res, 200, { success: true, message: `Deleted key: ${key}` });
    } else {
      sendJson(res, 404, { success: false, error: "Key not found" });
    }
    return;
  }

  sendJson(res, 404, { success: false, error: "Not found" });
}

export function createServer(): http.Server {
  ensureUploadDir();
  return http.createServer(handleRequest);
}
