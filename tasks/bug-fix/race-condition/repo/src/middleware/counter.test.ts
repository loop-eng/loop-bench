import { describe, it, expect } from "vitest";
import { RequestCounter } from "./counter.js";

describe("RequestCounter", () => {
  it("starts at zero", async () => {
    const counter = new RequestCounter();
    expect(await counter.getCount()).toBe(0);
  });

  it("increments sequentially", async () => {
    const counter = new RequestCounter();
    await counter.increment();
    await counter.increment();
    await counter.increment();
    expect(await counter.getCount()).toBe(3);
  });

  it("decrements sequentially", async () => {
    const counter = new RequestCounter();
    await counter.increment();
    await counter.increment();
    await counter.decrement();
    expect(await counter.getCount()).toBe(1);
  });

  it("handles sequential increment and decrement pairs", async () => {
    const counter = new RequestCounter();
    await counter.increment();
    await counter.decrement();
    expect(await counter.getCount()).toBe(0);
  });
});
