import { describe, it, expect } from "vitest";
import {
  getModelPricing,
  calculateCost,
  listSupportedModels,
} from "./cost-tracker.js";

describe("getModelPricing", () => {
  it("returns exact match", () => {
    const pricing = getModelPricing("claude-sonnet-4-6");
    expect(pricing).toBeDefined();
    expect(pricing!.inputPerMillion).toBe(3);
    expect(pricing!.outputPerMillion).toBe(15);
  });

  it("returns undefined for unknown model", () => {
    expect(getModelPricing("unknown-model-xyz")).toBeUndefined();
  });
});

describe("calculateCost", () => {
  it("calculates cost for known model", () => {
    const cost = calculateCost("claude-sonnet-4-6", {
      input: 10_000,
      output: 1_000,
    });
    // (10000/1M * 3) + (1000/1M * 15) = 0.03 + 0.015 = 0.045
    expect(cost).toBeCloseTo(0.045, 5);
  });

  it("includes cache cost", () => {
    const cost = calculateCost("claude-sonnet-4-6", {
      input: 10_000,
      output: 1_000,
      cached: 5_000,
    });
    // 0.045 + (5000/1M * 0.3) = 0.045 + 0.0015 = 0.0465
    expect(cost).toBeCloseTo(0.0465, 5);
  });

  it("returns 0 for unknown model", () => {
    expect(calculateCost("nope", { input: 10_000, output: 1_000 })).toBe(0);
  });
});

describe("listSupportedModels", () => {
  it("returns non-empty array", () => {
    const models = listSupportedModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models).toContain("claude-sonnet-4-6");
  });
});
