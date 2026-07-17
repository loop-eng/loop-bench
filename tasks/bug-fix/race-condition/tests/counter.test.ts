import { describe, it, expect } from "vitest";
import { RequestCounter } from "../repo/src/middleware/counter.js";

describe("RequestCounter (hidden tests)", () => {
  it("handles concurrent increments correctly", async () => {
    const counter = new RequestCounter();
    const ops = Array.from({ length: 100 }, () => counter.increment());
    await Promise.all(ops);
    expect(await counter.getCount()).toBe(100);
  });

  it("handles concurrent decrements after increments", async () => {
    const counter = new RequestCounter();

    // First, increment 50 times sequentially to set baseline
    for (let i = 0; i < 50; i++) {
      await counter.increment();
    }
    expect(await counter.getCount()).toBe(50);

    // Now decrement 50 times concurrently
    const ops = Array.from({ length: 50 }, () => counter.decrement());
    await Promise.all(ops);
    expect(await counter.getCount()).toBe(0);
  });

  it("count never goes negative under concurrent load", async () => {
    const counter = new RequestCounter();

    // Increment 10 times, then decrement 20 times concurrently
    for (let i = 0; i < 10; i++) {
      await counter.increment();
    }

    const ops = Array.from({ length: 20 }, () => counter.decrement());
    await Promise.all(ops);

    const finalCount = await counter.getCount();
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });

  it("mixed concurrent increment and decrement operations", async () => {
    const counter = new RequestCounter();

    // Run 50 increments and 50 decrements concurrently
    const increments = Array.from({ length: 50 }, () => counter.increment());
    const decrements = Array.from({ length: 50 }, () => counter.decrement());
    await Promise.all([...increments, ...decrements]);

    const finalCount = await counter.getCount();
    // Count must never be negative
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });

  it("sequential operations still work after fix", async () => {
    const counter = new RequestCounter();
    await counter.increment();
    await counter.increment();
    await counter.increment();
    await counter.decrement();
    expect(await counter.getCount()).toBe(2);
  });
});
