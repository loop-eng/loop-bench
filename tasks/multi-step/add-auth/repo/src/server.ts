import express, { Request, Response } from 'express';
import { itemStore } from './models/item';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Item routes - currently unprotected
// TODO: These routes should require authentication
app.get('/items', (_req: Request, res: Response) => {
  const items = itemStore.findAll();
  res.json(items);
});

app.get('/items/:id', (req: Request, res: Response) => {
  const item = itemStore.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  return res.json(item);
});

app.post('/items', (req: Request, res: Response) => {
  const { name, value } = req.body;
  if (!name || typeof value !== 'number') {
    return res.status(400).json({ error: 'name and numeric value required' });
  }
  // TODO: ownerId should come from the authenticated user
  const item = itemStore.create(name, value, 'anonymous');
  return res.status(201).json(item);
});

app.delete('/items/:id', (req: Request, res: Response) => {
  const deleted = itemStore.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Item not found' });
  return res.status(204).send();
});

// TODO: Add auth routes (POST /auth/login)
// TODO: Add auth middleware to protect item routes

export { app };

export function startServer(port: number = 3000): void {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

if (require.main === module) {
  startServer();
}
