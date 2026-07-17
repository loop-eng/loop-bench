import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test-secret-key";

interface WebhookEvent {
  event: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const receivedEvents: WebhookEvent[] = [];

app.post("/webhooks/events", (req: Request, res: Response) => {
  const event: WebhookEvent = {
    event: req.body.event,
    timestamp: req.body.timestamp || new Date().toISOString(),
    payload: req.body.payload || {},
  };

  if (!event.event) {
    res.status(400).json({ error: "Missing event field" });
    return;
  }

  receivedEvents.push(event);

  res.status(200).json({
    received: true,
    eventId: receivedEvents.length,
  });
});

app.get("/webhooks/events", (_req: Request, res: Response) => {
  res.json({
    events: receivedEvents,
    total: receivedEvents.length,
  });
});

app.post("/webhooks/events/batch", (req: Request, res: Response) => {
  const { events } = req.body;

  if (!Array.isArray(events)) {
    res.status(400).json({ error: "events must be an array" });
    return;
  }

  const results: Array<{ eventId: number; event: string }> = [];

  for (const evt of events) {
    if (!evt.event) continue;
    const webhookEvent: WebhookEvent = {
      event: evt.event,
      timestamp: evt.timestamp || new Date().toISOString(),
      payload: evt.payload || {},
    };
    receivedEvents.push(webhookEvent);
    results.push({
      eventId: receivedEvents.length,
      event: webhookEvent.event,
    });
  }

  res.status(200).json({
    received: results.length,
    results,
  });
});

export { app };
export default app;
