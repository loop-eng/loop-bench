import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { ConnectionTracker, Connection } from "../repo/src/events/tracker.js";

function createMockConnection(id: string): Connection {
  const emitter = new EventEmitter() as Connection;
  emitter.id = id;
  return emitter;
}

describe("ConnectionTracker (hidden tests)", () => {
  it("removes all listeners on destroy", () => {
    const tracker = new ConnectionTracker();
    const conn = createMockConnection("conn-1");

    expect(conn.listenerCount("data")).toBe(0);
    expect(conn.listenerCount("error")).toBe(0);

    tracker.track(conn);

    expect(conn.listenerCount("data")).toBe(1);
    expect(conn.listenerCount("error")).toBe(1);

    tracker.destroy();

    expect(conn.listenerCount("data")).toBe(0);
    expect(conn.listenerCount("error")).toBe(0);
  });

  it("does not fire events after destroy", () => {
    const tracker = new ConnectionTracker();
    const conn = createMockConnection("conn-1");

    tracker.track(conn);
    conn.emit("data", "before-destroy");
    expect(tracker.getEvents()).toHaveLength(1);

    tracker.destroy();

    // After destroy, emitting on the connection should not add events
    // (listeners should be removed, so nothing captures this)
    conn.emit("data", "after-destroy");
    // Events were cleared on destroy, and no new ones should appear
    expect(tracker.getEvents()).toHaveLength(0);
  });

  it("handles multiple track/destroy cycles without leaking listeners", () => {
    const conn = createMockConnection("conn-1");

    for (let i = 0; i < 100; i++) {
      const tracker = new ConnectionTracker();
      tracker.track(conn);
      tracker.destroy();
    }

    // After 100 track/destroy cycles, there should be zero listeners
    expect(conn.listenerCount("data")).toBe(0);
    expect(conn.listenerCount("error")).toBe(0);
  });

  it("removes listeners for multiple tracked connections", () => {
    const tracker = new ConnectionTracker();
    const conn1 = createMockConnection("conn-1");
    const conn2 = createMockConnection("conn-2");
    const conn3 = createMockConnection("conn-3");

    tracker.track(conn1);
    tracker.track(conn2);
    tracker.track(conn3);

    expect(conn1.listenerCount("data")).toBe(1);
    expect(conn2.listenerCount("data")).toBe(1);
    expect(conn3.listenerCount("data")).toBe(1);

    tracker.destroy();

    expect(conn1.listenerCount("data")).toBe(0);
    expect(conn2.listenerCount("data")).toBe(0);
    expect(conn3.listenerCount("data")).toBe(0);
    expect(conn1.listenerCount("error")).toBe(0);
    expect(conn2.listenerCount("error")).toBe(0);
    expect(conn3.listenerCount("error")).toBe(0);
  });

  it("does not remove listeners added by other code", () => {
    const tracker = new ConnectionTracker();
    const conn = createMockConnection("conn-1");

    // External listener added before tracking
    const externalHandler = () => {};
    conn.on("data", externalHandler);

    tracker.track(conn);
    expect(conn.listenerCount("data")).toBe(2);

    tracker.destroy();

    // Only the tracker's listener should be removed
    expect(conn.listenerCount("data")).toBe(1);
  });
});
