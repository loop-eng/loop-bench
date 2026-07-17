import express from 'express';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Add task routes here
// The tasks resource should be available at /tasks
// Implement: POST /tasks, GET /tasks/:id, PUT /tasks/:id, DELETE /tasks/:id

export { app };

export function startServer(port: number = 3000): void {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

if (require.main === module) {
  startServer();
}
