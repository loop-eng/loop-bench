import http from "node:http";

export interface Item {
  id: string;
  name: string;
  price: number;
}

// In-memory store
const items: Map<string, Item> = new Map();

// Simulated dependency check (e.g., database connection)
let dependencyAvailable = true;

export function setDependencyAvailable(available: boolean): void {
  dependencyAvailable = available;
}

export function isDependencyAvailable(): boolean {
  return dependencyAvailable;
}

export function getItems(): Item[] {
  return Array.from(items.values());
}

export function getItem(id: string): Item | undefined {
  return items.get(id);
}

export function addItem(item: Item): void {
  items.set(item.id, item);
}

export function deleteItem(id: string): boolean {
  return items.delete(id);
}

export function clearItems(): void {
  items.clear();
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  // GET /items
  if (method === "GET" && path === "/items") {
    sendJson(res, 200, { items: getItems() });
    return;
  }

  // GET /items/:id
  if (method === "GET" && path.startsWith("/items/")) {
    const id = path.slice("/items/".length);
    const item = getItem(id);
    if (!item) {
      sendJson(res, 404, { error: "Item not found" });
      return;
    }
    sendJson(res, 200, { item });
    return;
  }

  // POST /items
  if (method === "POST" && path === "/items") {
    const body = await parseBody(req);
    const data = JSON.parse(body) as Item;
    if (!data.id || !data.name || data.price == null) {
      sendJson(res, 400, { error: "Missing required fields: id, name, price" });
      return;
    }
    addItem(data);
    sendJson(res, 201, { item: data });
    return;
  }

  // DELETE /items/:id
  if (method === "DELETE" && path.startsWith("/items/")) {
    const id = path.slice("/items/".length);
    const deleted = deleteItem(id);
    if (!deleted) {
      sendJson(res, 404, { error: "Item not found" });
      return;
    }
    sendJson(res, 204, null);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

export function createServer(): http.Server {
  return http.createServer(handleRequest);
}
