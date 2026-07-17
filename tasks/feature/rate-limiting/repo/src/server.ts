import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

interface Item {
  id: number;
  name: string;
  category: string;
}

const items: Item[] = [
  { id: 1, name: "Widget A", category: "tools" },
  { id: 2, name: "Widget B", category: "tools" },
  { id: 3, name: "Gadget X", category: "electronics" },
  { id: 4, name: "Gadget Y", category: "electronics" },
  { id: 5, name: "Gizmo Z", category: "accessories" },
];

app.get("/api/items", (_req: Request, res: Response) => {
  res.json({ items, total: items.length });
});

app.get("/api/items/:id", (req: Request, res: Response) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
});

app.post("/api/items", (req: Request, res: Response) => {
  const { name, category } = req.body;
  if (!name || !category) {
    res.status(400).json({ error: "name and category are required" });
    return;
  }
  const newItem: Item = {
    id: items.length + 1,
    name,
    category,
  };
  items.push(newItem);
  res.status(201).json(newItem);
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export { app };
export default app;
