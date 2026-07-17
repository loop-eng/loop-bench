import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  role: "admin" | "user" | "moderator";
}

const users: User[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", age: 30, role: "admin" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", age: 25, role: "user" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", age: 35, role: "moderator" },
];

let nextId = 4;

app.get("/api/users", (_req: Request, res: Response) => {
  res.json({ users, total: users.length });
});

app.get("/api/users/:id", (req: Request, res: Response) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

app.post("/api/users", (req: Request, res: Response) => {
  const { name, email, age, role } = req.body;
  const newUser: User = {
    id: nextId++,
    name,
    email,
    age,
    role: role || "user",
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.put("/api/users/:id", (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === Number(req.params.id));
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { name, email, age, role } = req.body;
  users[idx] = {
    ...users[idx],
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(age !== undefined && { age }),
    ...(role !== undefined && { role }),
  };
  res.json(users[idx]);
});

app.delete("/api/users/:id", (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === Number(req.params.id));
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const deleted = users.splice(idx, 1);
  res.json({ deleted: deleted[0] });
});

export { app };
export default app;
