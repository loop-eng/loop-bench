import { describe, it, expect } from "vitest";
import { createEmptyMetrics, summarizeRun } from "./metrics.js";
import type { BenchmarkResult } from "./types.js";

describe("createEmptyMetrics", () => {
  it("returns zeroed metrics with resolved=false", () => {
    const m = createEmptyMetrics();
    expect(m.resolved).toBe(false);
    expect(m.iterations).toBe(0);
    expect(m.costUsd).toBe(0);
    expect(m.driftScore).toBe(1);
    expect(m.honestyScore).toBe(0);
  });
});

describe("summarizeRun", () => {
  it("computes averages over results", () => {
    const results: BenchmarkResult[] = [
      {
        taskId: "t1",
        loopDesign: "minimal",
        model: "test-model",
        metrics: {
          ...createEmptyMetrics(),
          resolved: true,
          iterations: 4,
          costUsd: 1.0,
          convergenceRate: 0.5,
          driftScore: 0.1,
          erosionScore: 0.2,
          honestyScore: 0.9,
        },
        ltfTrace: "t1.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
      {
        taskId: "t2",
        loopDesign: "minimal",
        model: "test-model",
        metrics: {
          ...createEmptyMetrics(),
          resolved: false,
          iterations: 10,
          costUsd: 3.0,
          convergenceRate: 0.0,
          driftScore: 0.3,
          erosionScore: 0.4,
          honestyScore: 0.8,
        },
        ltfTrace: "t2.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
    ];

    const summary = summarizeRun("minimal", "test-model", results);

    expect(summary.totalTasks).toBe(2);
    expect(summary.resolved).toBe(1);
    expect(summary.passRate).toBe(0.5);
    expect(summary.avgCostPerTask).toBeCloseTo(2.0, 10);
    expect(summary.avgIterations).toBeCloseTo(7, 10);
    expect(summary.avgConvergenceRate).toBeCloseTo(0.25, 10);
    expect(summary.avgDriftScore).toBeCloseTo(0.2, 10);
    expect(summary.avgErosionScore).toBeCloseTo(0.3, 10);
    expect(summary.avgHonestyScore).toBeCloseTo(0.85, 10);
  });

  it("handles empty results", () => {
    const summary = summarizeRun("empty", "none", []);
    expect(summary.totalTasks).toBe(0);
    expect(summary.passRate).toBe(0);
    expect(summary.avgCostPerTask).toBe(0);
  });
});
