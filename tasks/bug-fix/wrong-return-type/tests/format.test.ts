import { describe, it, expect } from "vitest";
import { formatCurrency } from "../repo/src/utils/format.js";

describe("formatCurrency (hidden tests)", () => {
  it("returns a string", () => {
    expect(typeof formatCurrency(100)).toBe("string");
  });

  it("includes dollar sign", () => {
    expect(formatCurrency(100)).toContain("$");
  });

  it("formats with two decimal places", () => {
    const result = formatCurrency(100);
    expect(result).toMatch(/\.\d{2}$/);
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0);
    expect(typeof result).toBe("string");
    expect(result).toContain("0.00");
  });

  it("formats large numbers with comma separators", () => {
    const result = formatCurrency(1234567.89);
    expect(result).toContain(",");
  });

  it("rounds to two decimal places", () => {
    const result = formatCurrency(19.999);
    expect(result).toContain("20.00");
  });

  it("handles negative amounts", () => {
    const result = formatCurrency(-50.5);
    expect(typeof result).toBe("string");
  });
});
