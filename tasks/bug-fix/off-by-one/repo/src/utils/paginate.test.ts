import { describe, it, expect } from "vitest";
import { paginate } from "./paginate.js";

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("returns correct total count", () => {
    const result = paginate(items, 1, 10);
    expect(result.total).toBe(25);
  });

  it("returns correct totalPages", () => {
    const result = paginate(items, 1, 10);
    expect(result.totalPages).toBe(3);
  });

  it("returns correct currentPage", () => {
    const result = paginate(items, 2, 10);
    expect(result.currentPage).toBe(2);
  });
});
