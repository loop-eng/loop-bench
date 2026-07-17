import { describe, it, expect } from "vitest";
import { generateReport, formatLeaderboard } from "./report.js";
import { createEmptyMetrics } from "./metrics.js";
import type { BenchmarkResult } from "./types.js";

describe("generateReport", () => {
  it("groups by loop design and model", () => {
    const results: BenchmarkResult[] = [
      {
        taskId: "t1",
        loopDesign: "minimal",
        model: "m1",
        metrics: { ...createEmptyMetrics(), resolved: true },
        ltfTrace: "t1.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
      {
        taskId: "t2",
        loopDesign: "reflexion",
        model: "m1",
        metrics: { ...createEmptyMetrics(), resolved: true },
        ltfTrace: "t2.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
      {
        taskId: "t1",
        loopDesign: "minimal",
        model: "m1",
        metrics: { ...createEmptyMetrics(), resolved: false },
        ltfTrace: "t1b.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
    ];

    const report = generateReport(results);
    expect(report).toHaveLength(2);

    const minimalSummary = report.find((s) => s.loopDesign === "minimal");
    expect(minimalSummary).toBeDefined();
    expect(minimalSummary!.totalTasks).toBe(2);
    expect(minimalSummary!.resolved).toBe(1);
  });

  it("sorts by pass rate descending", () => {
    const results: BenchmarkResult[] = [
      {
        taskId: "t1",
        loopDesign: "bad",
        model: "m1",
        metrics: { ...createEmptyMetrics(), resolved: false },
        ltfTrace: "t1.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
      {
        taskId: "t1",
        loopDesign: "good",
        model: "m1",
        metrics: { ...createEmptyMetrics(), resolved: true },
        ltfTrace: "t2.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
    ];

    const report = generateReport(results);
    expect(report[0]!.loopDesign).toBe("good");
    expect(report[1]!.loopDesign).toBe("bad");
  });
});

describe("formatLeaderboard", () => {
  it("produces table output", () => {
    const results: BenchmarkResult[] = [
      {
        taskId: "t1",
        loopDesign: "minimal",
        model: "m1",
        metrics: {
          ...createEmptyMetrics(),
          resolved: true,
          costUsd: 1.5,
          iterations: 5,
          driftScore: 0.1,
          honestyScore: 0.95,
          erosionScore: 0.2,
        },
        ltfTrace: "t1.ltf.jsonl",
        timestamp: "2026-07-17T00:00:00Z",
      },
    ];

    const report = generateReport(results);
    const table = formatLeaderboard(report);

    expect(table).toContain("Loop Design");
    expect(table).toContain("minimal");
    expect(table).toContain("100%");
  });
});
