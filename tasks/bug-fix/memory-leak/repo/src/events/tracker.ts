import { EventEmitter } from "node:events";

export interface Connection extends EventEmitter {
  id: string;
}

export interface TrackedEvent {
  connectionId: string;
  type: string;
  data: unknown;
  timestamp: number;
}

export class ConnectionTracker {
  private events: TrackedEvent[] = [];
  private destroyed = false;
  private connections: Map<string, Connection> = new Map();

  track(connection: Connection): void {
    if (this.destroyed) {
      throw new Error("Tracker has been destroyed");
    }

    this.connections.set(connection.id, connection);

    connection.on("data", (data: unknown) => {
      this.events.push({
        connectionId: connection.id,
        type: "data",
        data,
        timestamp: Date.now(),
      });
    });

    connection.on("error", (error: unknown) => {
      this.events.push({
        connectionId: connection.id,
        type: "error",
        data: error,
        timestamp: Date.now(),
      });
    });
  }

  getEvents(): TrackedEvent[] {
    return [...this.events];
  }

  getEventsByConnection(connectionId: string): TrackedEvent[] {
    return this.events.filter((e) => e.connectionId === connectionId);
  }

  destroy(): void {
    this.destroyed = true;
    this.events = [];
    this.connections.clear();
    // BUG: listeners are never removed from connection objects
    // This causes a memory leak as orphaned listeners accumulate
  }
}
