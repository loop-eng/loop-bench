import type { BenchmarkResult, RunSummary } from "./types.js";
import { summarizeRun } from "./metrics.js";

export function generateReport(results: BenchmarkResult[]): RunSummary[] {
  const groups = new Map<string, BenchmarkResult[]>();

  for (const result of results) {
    const key = `${result.loopDesign}::${result.model}`;
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }

  const summaries: RunSummary[] = [];

  for (const [, group] of groups) {
    const first = group[0];
    if (!first) continue;
    summaries.push(summarizeRun(first.loopDesign, first.model, group));
  }

  return summaries.sort((a, b) => b.passRate - a.passRate);
}

export function formatLeaderboardRow(summary: RunSummary): string {
  const cols = [
    summary.loopDesign.padEnd(20),
    `${(summary.passRate * 100).toFixed(0)}%`.padStart(5),
    `$${summary.avgCostPerTask.toFixed(2)}`.padStart(8),
    summary.avgIterations.toFixed(1).padStart(6),
    summary.avgDriftScore.toFixed(2).padStart(6),
    summary.avgHonestyScore.toFixed(2).padStart(7),
    summary.avgErosionScore.toFixed(2).padStart(7),
  ];
  return cols.join(" | ");
}

export function formatLeaderboard(summaries: RunSummary[]): string {
  const header = [
    "Loop Design".padEnd(20),
    " Pass".padStart(5),
    "  $/Task".padStart(8),
    " Iters".padStart(6),
    " Drift".padStart(6),
    "Honesty".padStart(7),
    "Erosion".padStart(7),
  ].join(" | ");

  const separator = "-".repeat(header.length);
  const rows = summaries.map(formatLeaderboardRow);

  return [header, separator, ...rows].join("\n");
}
