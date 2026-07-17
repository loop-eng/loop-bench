import { describe, it, expect } from "vitest";
import { formatPercent, formatCompact } from "./format.js";

describe("formatPercent", () => {
  it("formats decimal as percentage", () => {
    expect(formatPercent(0.156)).toBe("15.6%");
  });
});

describe("formatCompact", () => {
  it("formats millions", () => {
    expect(formatCompact(2_500_000)).toBe("2.5M");
  });
  it("formats thousands", () => {
    expect(formatCompact(4_200)).toBe("4.2K");
  });
  it("returns plain number for small values", () => {
    expect(formatCompact(42)).toBe("42");
  });
});
