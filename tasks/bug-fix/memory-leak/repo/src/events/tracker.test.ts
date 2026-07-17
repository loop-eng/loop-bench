import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { ConnectionTracker, Connection } from "./tracker.js";

function createMockConnection(id: string): Connection {
  const emitter = new EventEmitter() as Connection;
  emitter.id = id;
  return emitter;
}

describe("ConnectionTracker", () => {
  it("tracks data events from a connection", () => {
    const tracker = new ConnectionTracker();
    const conn = createMockConnection("conn-1");

    tracker.track(conn);
    conn.emit("data", { message: "hello" });

    const events = tracker.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].connectionId).toBe("conn-1");
    expect(events[0].type).toBe("data");
    expect(events[0].data).toEqual({ message: "hello" });
  });

  it("tracks error events from a connection", () => {
    const tracker = new ConnectionTracker();
    const conn = createMockConnection("conn-2");

    tracker.track(conn);
    conn.emit("error", new Error("connection failed"));

    const events = tracker.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
  });

  it("tracks multiple connections", () => {
    const tracker = new ConnectionTracker();
    const conn1 = createMockConnection("conn-1");
    const conn2 = createMockConnection("conn-2");

    tracker.track(conn1);
    tracker.track(conn2);

    conn1.emit("data", "from-1");
    conn2.emit("data", "from-2");

    expect(tracker.getEvents()).toHaveLength(2);
  });

  it("filters events by connection id", () => {
    const tracker = new ConnectionTracker();
    const conn1 = createMockConnection("conn-1");
    const conn2 = createMockConnection("conn-2");

    tracker.track(conn1);
    tracker.track(conn2);

    conn1.emit("data", "a");
    conn2.emit("data", "b");
    conn1.emit("data", "c");

    const conn1Events = tracker.getEventsByConnection("conn-1");
    expect(conn1Events).toHaveLength(2);
  });

  it("throws if tracking after destroy", () => {
    const tracker = new ConnectionTracker();
    tracker.destroy();

    const conn = createMockConnection("conn-1");
    expect(() => tracker.track(conn)).toThrow("Tracker has been destroyed");
  });

  it("clears events on destroy", () => {
    const tracker = new ConnectionTracker();
    const conn = createMockConnection("conn-1");

    tracker.track(conn);
    conn.emit("data", "test");
    expect(tracker.getEvents()).toHaveLength(1);

    tracker.destroy();
    expect(tracker.getEvents()).toHaveLength(0);
  });
});
