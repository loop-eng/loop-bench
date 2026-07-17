import { describe, it, expect } from "vitest";
import { paginate } from "../repo/src/utils/paginate.js";

describe("paginate (hidden tests)", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("page 1 returns the first N items", () => {
    const result = paginate(items, 1, 10);
    expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("page 2 returns the correct items", () => {
    const result = paginate(items, 2, 10);
    expect(result.data).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("last page has the correct count", () => {
    const result = paginate(items, 3, 10);
    expect(result.data).toEqual([21, 22, 23, 24, 25]);
    expect(result.data.length).toBe(5);
  });

  it("empty page returns empty array", () => {
    const result = paginate(items, 4, 10);
    expect(result.data).toEqual([]);
  });

  it("page 0 returns empty array", () => {
    const result = paginate(items, 0, 10);
    expect(result.data).toEqual([]);
  });
});
