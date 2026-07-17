import { describe, it, expect } from "vitest";
import {
  computeConvergenceRate,
  computeCostEfficiency,
  computeVerificationAccuracy,
  computeDriftScore,
  computeFalseCompletion,
  computeErosionScore,
  computeVerbosityScore,
  computeHonestyScore,
  computeFirstEditDelay,
  computeContextEfficiency,
  computeRecoveryRate,
  computeCompositeScore,
  bootstrapCI,
  compareLoopDesigns,
} from "./metrics-engine.js";
import { createEmptyMetrics } from "./metrics.js";
import type { BenchmarkResult } from "./types.js";

function makeResult(overrides: Partial<BenchmarkResult["metrics"]> = {}): BenchmarkResult {
  return {
    taskId: "test-001",
    loopDesign: "test",
    model: "test-model",
    metrics: { ...createEmptyMetrics(), ...overrides },
    ltfTrace: "t.ltf.jsonl",
    timestamp: "2026-07-18T00:00:00Z",
  };
}

describe("computeConvergenceRate", () => {
  it("returns 0.1 for 2 iterations out of 20", () => {
    expect(computeConvergenceRate(2, 20)).toBe(0.1);
  });
  it("returns 1 when all iterations used", () => {
    expect(computeConvergenceRate(20, 20)).toBe(1);
  });
  it("caps at 1 if iterations exceed max", () => {
    expect(computeConvergenceRate(25, 20)).toBe(1);
  });
  it("returns 1 for max_iterations=0", () => {
    expect(computeConvergenceRate(5, 0)).toBe(1);
  });
  it("returns 0.05 for 1 iteration out of 20", () => {
    expect(computeConvergenceRate(1, 20)).toBe(0.05);
  });
});

describe("computeCostEfficiency", () => {
  it("returns cost when resolved", () => {
    expect(computeCostEfficiency(1.5, true)).toBeCloseTo(1.5, 5);
  });
  it("returns Infinity when not resolved", () => {
    expect(computeCostEfficiency(1.5, false)).toBe(Infinity);
  });
  it("returns 0 for zero cost when resolved", () => {
    expect(computeCostEfficiency(0, true)).toBe(0);
  });
});

describe("computeVerificationAccuracy", () => {
  it("passes through the rate", () => {
    expect(computeVerificationAccuracy(0.75)).toBe(0.75);
  });
  it("returns 0 for 0", () => {
    expect(computeVerificationAccuracy(0)).toBe(0);
  });
  it("returns 1 for 1", () => {
    expect(computeVerificationAccuracy(1)).toBe(1);
  });
});

describe("computeDriftScore", () => {
  it("returns 0 when files match exactly", () => {
    expect(computeDriftScore(["a.ts"], ["a.ts"])).toBe(0);
  });
  it("returns 1 when no files changed", () => {
    expect(computeDriftScore(["a.ts"], [])).toBe(1);
  });
  it("returns 1 when completely different files", () => {
    expect(computeDriftScore(["a.ts"], ["b.ts"])).toBe(1);
  });
  it("returns 0.5 for partial overlap (1 of 2 match + 1 extra)", () => {
    expect(computeDriftScore(["a.ts", "b.ts"], ["a.ts", "c.ts"])).toBeCloseTo(0.667, 2);
  });
  it("uses TF-IDF when text provided", () => {
    const drift = computeDriftScore(
      [],
      [],
      "fix the return type in format function",
      "changed return type of formatCurrency function to string",
    );
    expect(drift).toBeGreaterThan(0);
    expect(drift).toBeLessThan(1);
  });
  it("TF-IDF returns ~0 for identical texts", () => {
    const text = "fix the pagination offset calculation";
    const drift = computeDriftScore([], [], text, text);
    expect(drift).toBeCloseTo(0, 1);
  });
  it("TF-IDF returns high drift for unrelated texts", () => {
    const drift = computeDriftScore(
      [],
      [],
      "fix authentication token validation",
      "update database migration schema for user table",
    );
    expect(drift).toBeGreaterThan(0.5);
  });
});

describe("computeFalseCompletion", () => {
  it("true when claimed success but tests fail", () => {
    expect(computeFalseCompletion(true, false)).toBe(true);
  });
  it("false when claimed success and tests pass", () => {
    expect(computeFalseCompletion(true, true)).toBe(false);
  });
  it("false when did not claim success", () => {
    expect(computeFalseCompletion(false, false)).toBe(false);
  });
  it("false when did not claim but tests pass", () => {
    expect(computeFalseCompletion(false, true)).toBe(false);
  });
});

describe("computeErosionScore", () => {
  it("returns 0 when lines unchanged", () => {
    expect(computeErosionScore(100, 100)).toBe(0);
  });
  it("returns positive when lines grow", () => {
    expect(computeErosionScore(100, 150)).toBe(0.5);
  });
  it("returns 0 when lines decrease (improvement)", () => {
    expect(computeErosionScore(100, 80)).toBe(0);
  });
  it("caps at 1", () => {
    expect(computeErosionScore(10, 200)).toBe(1);
  });
  it("handles initial=0", () => {
    expect(computeErosionScore(0, 50)).toBeGreaterThan(0);
    expect(computeErosionScore(0, 50)).toBeLessThanOrEqual(1);
  });
  it("returns 0 for both zero", () => {
    expect(computeErosionScore(0, 0)).toBe(0);
  });
});

describe("computeVerbosityScore", () => {
  it("returns 0 for no duplicates", () => {
    expect(computeVerbosityScore(["a", "b", "c"])).toBe(0);
  });
  it("detects duplicates", () => {
    const score = computeVerbosityScore([
      "const x = 1;",
      "const y = 2;",
      "const x = 1;",
      "const z = 3;",
    ]);
    expect(score).toBeGreaterThan(0);
  });
  it("returns 0 for empty array", () => {
    expect(computeVerbosityScore([])).toBe(0);
  });
  it("ignores boilerplate (imports, comments)", () => {
    expect(
      computeVerbosityScore([
        "import { foo } from 'bar';",
        "import { foo } from 'bar';",
      ]),
    ).toBe(0);
  });
  it("normalizes whitespace", () => {
    const score = computeVerbosityScore([
      "  const x = 1;  ",
      "const x = 1;",
      "const y = 2;",
    ]);
    expect(score).toBeGreaterThan(0);
  });
  it("caps at 1", () => {
    const lines = Array(10).fill("const x = 1;") as string[];
    expect(computeVerbosityScore(lines)).toBeLessThanOrEqual(1);
  });
});

describe("computeHonestyScore", () => {
  it("returns 1 for perfect match", () => {
    expect(computeHonestyScore(["a.ts", "b.ts"], ["a.ts", "b.ts"])).toBe(1);
  });
  it("returns 0 for no overlap", () => {
    expect(computeHonestyScore(["a.ts"], ["b.ts"])).toBe(0);
  });
  it("returns 1 when both empty", () => {
    expect(computeHonestyScore([], [])).toBe(1);
  });
  it("handles partial overlap", () => {
    expect(computeHonestyScore(["a.ts", "b.ts"], ["b.ts", "c.ts"])).toBeCloseTo(0.333, 2);
  });
  it("claimed superset of actual", () => {
    expect(computeHonestyScore(["a.ts", "b.ts", "c.ts"], ["a.ts"])).toBeCloseTo(0.333, 2);
  });
});

describe("computeFirstEditDelay", () => {
  it("returns index when found", () => {
    expect(computeFirstEditDelay(3, 10)).toBe(3);
  });
  it("returns totalEvents when not found", () => {
    expect(computeFirstEditDelay(-1, 10)).toBe(10);
  });
  it("returns 0 when first event is edit", () => {
    expect(computeFirstEditDelay(0, 10)).toBe(0);
  });
});

describe("computeContextEfficiency", () => {
  it("computes ratio correctly", () => {
    expect(computeContextEfficiency(2000, 10000)).toBe(0.2);
  });
  it("returns 0 for no tokens", () => {
    expect(computeContextEfficiency(0, 0)).toBe(0);
  });
  it("returns 1 when all output", () => {
    expect(computeContextEfficiency(1000, 1000)).toBe(1);
  });
});

describe("computeRecoveryRate", () => {
  it("returns ratio of recoveries to failures", () => {
    expect(computeRecoveryRate(2, 4, true)).toBe(0.5);
  });
  it("returns 1 when no failures but had verifications", () => {
    expect(computeRecoveryRate(0, 0, true)).toBe(1);
  });
  it("returns 0 when no failures and no verifications", () => {
    expect(computeRecoveryRate(0, 0, false)).toBe(0);
  });
  it("returns 0 when no recoveries from failures", () => {
    expect(computeRecoveryRate(0, 3, true)).toBe(0);
  });
});

describe("computeCompositeScore", () => {
  it("returns 0 for empty results", () => {
    expect(computeCompositeScore([], 5)).toBe(0);
  });

  it("computes composite from default weights", () => {
    const results = [
      makeResult({
        resolved: true,
        costUsd: 1,
        convergenceRate: 0.2,
        driftScore: 0.1,
        honestyScore: 0.9,
        erosionScore: 0.15,
        rubricScore: 0.8,
      }),
    ];
    const score = computeCompositeScore(results, 5);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("perfect results yield near-1 score", () => {
    const results = [
      makeResult({
        resolved: true,
        costUsd: 0,
        convergenceRate: 0,
        driftScore: 0,
        honestyScore: 1,
        erosionScore: 0,
        rubricScore: 1,
      }),
    ];
    const score = computeCompositeScore(results, 5);
    expect(score).toBeCloseTo(1, 1);
  });

  it("terrible results yield near-0 score", () => {
    const results = [
      makeResult({
        resolved: false,
        costUsd: 50,
        convergenceRate: 1,
        driftScore: 1,
        honestyScore: 0,
        erosionScore: 1,
        rubricScore: 0,
      }),
    ];
    const score = computeCompositeScore(results, 5);
    expect(score).toBeLessThan(0.1);
  });
});

describe("bootstrapCI", () => {
  it("returns single value for single-element array", () => {
    const ci = bootstrapCI([5]);
    expect(ci.mean).toBe(5);
    expect(ci.lower).toBe(5);
    expect(ci.upper).toBe(5);
  });

  it("returns zeros for empty array", () => {
    const ci = bootstrapCI([]);
    expect(ci.mean).toBe(0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0);
  });

  it("CI contains the mean", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ci = bootstrapCI(values);
    expect(ci.lower).toBeLessThanOrEqual(ci.mean);
    expect(ci.upper).toBeGreaterThanOrEqual(ci.mean);
  });

  it("narrow CI for identical values", () => {
    const values = Array(20).fill(3.0) as number[];
    const ci = bootstrapCI(values);
    expect(ci.lower).toBeCloseTo(3, 1);
    expect(ci.upper).toBeCloseTo(3, 1);
  });

  it("wider CI for high-variance data", () => {
    const low = [0, 0, 0, 0, 0, 10, 10, 10, 10, 10];
    const ci = bootstrapCI(low);
    expect(ci.upper - ci.lower).toBeGreaterThan(1);
  });

  it("is deterministic with same seed", () => {
    const vals = [1, 2, 3, 4, 5];
    const a = bootstrapCI(vals, 1000, 0.95, 42);
    const b = bootstrapCI(vals, 1000, 0.95, 42);
    expect(a.lower).toBe(b.lower);
    expect(a.upper).toBe(b.upper);
  });
});

describe("compareLoopDesigns", () => {
  it("detects significant improvement", () => {
    const baseline = [
      makeResult({ costUsd: 5 }),
      makeResult({ costUsd: 6 }),
      makeResult({ costUsd: 5.5 }),
      makeResult({ costUsd: 5.2 }),
      makeResult({ costUsd: 5.8 }),
    ];
    const candidate = [
      makeResult({ costUsd: 2 }),
      makeResult({ costUsd: 2.5 }),
      makeResult({ costUsd: 1.8 }),
      makeResult({ costUsd: 2.1 }),
      makeResult({ costUsd: 2.3 }),
    ];
    const result = compareLoopDesigns(baseline, candidate, "costUsd");
    expect(result.delta).toBeLessThan(0);
    expect(result.significant).toBe(true);
  });

  it("detects no significant difference for similar results", () => {
    const baseline = [
      makeResult({ costUsd: 3 }),
      makeResult({ costUsd: 3.1 }),
      makeResult({ costUsd: 2.9 }),
    ];
    const candidate = [
      makeResult({ costUsd: 3.05 }),
      makeResult({ costUsd: 2.95 }),
      makeResult({ costUsd: 3.02 }),
    ];
    const result = compareLoopDesigns(baseline, candidate, "costUsd");
    expect(Math.abs(result.delta)).toBeLessThan(0.5);
  });

  it("handles boolean metrics", () => {
    const baseline = [
      makeResult({ resolved: true }),
      makeResult({ resolved: false }),
    ];
    const candidate = [
      makeResult({ resolved: true }),
      makeResult({ resolved: true }),
    ];
    const result = compareLoopDesigns(baseline, candidate, "resolved");
    expect(result.candidateMean).toBe(1);
    expect(result.baselineMean).toBe(0.5);
  });
});
