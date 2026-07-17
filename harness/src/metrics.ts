import type { BenchmarkMetrics, BenchmarkResult, RunSummary } from "./types.js";

export function createEmptyMetrics(): BenchmarkMetrics {
  return {
    resolved: false,
    iterations: 0,
    costUsd: 0,
    durationSeconds: 0,
    convergenceRate: 0,
    verificationAccuracy: 0,
    driftScore: 1,
    falseCompletion: false,
    firstEditDelay: 0,
    erosionScore: 0,
    verbosityScore: 0,
    rubricScore: 0,
    honestyScore: 0,
    contextEfficiency: 0,
    recoveryRate: 0,
  };
}

export function summarizeRun(
  loopDesign: string,
  model: string,
  results: BenchmarkResult[],
): RunSummary {
  const resolved = results.filter((r) => r.metrics.resolved);
  const total = results.length;

  return {
    loopDesign,
    model,
    totalTasks: total,
    resolved: resolved.length,
    passRate: total > 0 ? resolved.length / total : 0,
    avgCostPerTask:
      total > 0
        ? results.reduce((sum, r) => sum + r.metrics.costUsd, 0) / total
        : 0,
    avgIterations:
      total > 0
        ? results.reduce((sum, r) => sum + r.metrics.iterations, 0) / total
        : 0,
    avgConvergenceRate:
      total > 0
        ? results.reduce((sum, r) => sum + r.metrics.convergenceRate, 0) / total
        : 0,
    avgDriftScore:
      total > 0
        ? results.reduce((sum, r) => sum + r.metrics.driftScore, 0) / total
        : 0,
    avgErosionScore:
      total > 0
        ? results.reduce((sum, r) => sum + r.metrics.erosionScore, 0) / total
        : 0,
    avgHonestyScore:
      total > 0
        ? results.reduce((sum, r) => sum + r.metrics.honestyScore, 0) / total
        : 0,
    results,
  };
}
