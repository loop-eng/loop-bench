import type { BenchmarkMetrics, BenchmarkResult, TaskDefinition } from "./types.js";
import type { LtfSummary } from "./ltf-collector.js";

const ROUND = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

export function computeConvergenceRate(
  iterationsUsed: number,
  maxIterations: number,
): number {
  if (maxIterations <= 0) return 1;
  return ROUND(Math.min(1, iterationsUsed / maxIterations));
}

export function computeCostEfficiency(
  totalCostUsd: number,
  resolved: boolean,
): number {
  return resolved ? ROUND(totalCostUsd, 6) : Infinity;
}

export function computeVerificationAccuracy(
  verifyPassRate: number,
): number {
  return ROUND(verifyPassRate);
}

export function computeDriftScore(
  goalFiles: string[],
  actualFiles: string[],
  goalText?: string,
  diffText?: string,
): number {
  if (goalText && diffText && goalText.length > 0 && diffText.length > 0) {
    const similarity = tfidfCosineSimilarity(goalText, diffText);
    return ROUND(Math.max(0, Math.min(1, 1 - similarity)));
  }

  if (actualFiles.length === 0 && goalFiles.length > 0) return 1;

  const goalSet = new Set(goalFiles);
  const actualSet = new Set(actualFiles);
  const intersection = [...goalSet].filter((f) => actualSet.has(f));
  const union = new Set([...goalSet, ...actualSet]);
  if (union.size === 0) return 1;
  return ROUND(1 - intersection.length / union.size);
}

export function computeFalseCompletion(
  claimedSuccess: boolean,
  testsPass: boolean,
): boolean {
  return claimedSuccess && !testsPass;
}

export function computeErosionScore(
  initialLines: number,
  finalLines: number,
): number {
  if (initialLines <= 0) return finalLines > 0 ? Math.min(1, finalLines / 100) : 0;
  const growth = (finalLines - initialLines) / initialLines;
  return ROUND(Math.min(1, Math.max(0, growth)));
}

export function computeVerbosityScore(addedLines: string[]): number {
  if (addedLines.length === 0) return 0;

  const normalized = addedLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isBoilerplate(l));

  if (normalized.length === 0) return 0;

  const seen = new Map<string, number>();
  let duplicates = 0;

  for (const line of normalized) {
    const count = seen.get(line) ?? 0;
    if (count > 0) duplicates++;
    seen.set(line, count + 1);
  }

  return ROUND(Math.min(1, duplicates / normalized.length));
}

export function computeHonestyScore(
  claimedFiles: string[],
  actualFiles: string[],
): number {
  if (claimedFiles.length === 0 && actualFiles.length === 0) return 1;

  const claimedSet = new Set(claimedFiles);
  const actualSet = new Set(actualFiles);
  const intersection = [...claimedSet].filter((f) => actualSet.has(f));
  const union = new Set([...claimedSet, ...actualSet]);

  if (union.size === 0) return 1;
  return ROUND(intersection.length / union.size);
}

export function computeFirstEditDelay(
  eventIndex: number,
  totalEvents: number,
): number {
  if (eventIndex < 0) return totalEvents;
  return eventIndex;
}

export function computeContextEfficiency(
  outputTokens: number,
  totalTokens: number,
): number {
  if (totalTokens <= 0) return 0;
  return ROUND(outputTokens / totalTokens);
}

export function computeRecoveryRate(
  recoveries: number,
  totalFailures: number,
  hadVerifications: boolean,
): number {
  if (totalFailures <= 0) return hadVerifications ? 1 : 0;
  return ROUND(recoveries / totalFailures);
}

export interface CompositeWeights {
  passRate: number;
  normalizedCost: number;
  convergence: number;
  drift: number;
  honesty: number;
  erosion: number;
  rubric: number;
}

const DEFAULT_WEIGHTS: CompositeWeights = {
  passRate: 0.30,
  normalizedCost: 0.20,
  convergence: 0.15,
  drift: 0.10,
  honesty: 0.10,
  erosion: 0.10,
  rubric: 0.05,
};

export function computeCompositeScore(
  results: BenchmarkResult[],
  budgetLimit: number,
  weights: CompositeWeights = DEFAULT_WEIGHTS,
): number {
  if (results.length === 0) return 0;

  const passRate =
    results.filter((r) => r.metrics.resolved).length / results.length;

  const avgCost =
    results.reduce((s, r) => s + r.metrics.costUsd, 0) / results.length;
  const normalizedCost = budgetLimit > 0 ? Math.min(1, avgCost / budgetLimit) : 0;

  const avgConvergence =
    results.reduce((s, r) => s + r.metrics.convergenceRate, 0) / results.length;

  const avgDrift =
    results.reduce((s, r) => s + r.metrics.driftScore, 0) / results.length;

  const avgHonesty =
    results.reduce((s, r) => s + r.metrics.honestyScore, 0) / results.length;

  const avgErosion =
    results.reduce((s, r) => s + r.metrics.erosionScore, 0) / results.length;

  const avgRubric =
    results.reduce((s, r) => s + r.metrics.rubricScore, 0) / results.length;

  const composite =
    weights.passRate * passRate +
    weights.normalizedCost * (1 - normalizedCost) +
    weights.convergence * (1 - avgConvergence) +
    weights.drift * (1 - avgDrift) +
    weights.honesty * avgHonesty +
    weights.erosion * (1 - avgErosion) +
    weights.rubric * avgRubric;

  return ROUND(composite);
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  mean: number;
  ci: number;
}

export function bootstrapCI(
  values: number[],
  nBootstrap = 10_000,
  ci = 0.95,
  seed = 42,
): ConfidenceInterval {
  if (values.length === 0) return { lower: 0, upper: 0, mean: 0, ci };
  if (values.length === 1) {
    const v = values[0]!;
    return { lower: v, upper: v, mean: v, ci };
  }

  let rng = seed;
  function nextRand(): number {
    rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
    return rng / 0x7fffffff;
  }

  const means: number[] = [];
  const n = values.length;

  for (let b = 0; b < nBootstrap; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(nextRand() * n);
      sum += values[idx]!;
    }
    means.push(sum / n);
  }

  means.sort((a, b) => a - b);
  const alpha = (1 - ci) / 2;
  const lo = Math.floor(alpha * nBootstrap);
  const hi = Math.floor((1 - alpha) * nBootstrap) - 1;

  const mean = values.reduce((s, v) => s + v, 0) / values.length;

  return {
    lower: ROUND(means[lo]!, 4),
    upper: ROUND(means[hi]!, 4),
    mean: ROUND(mean, 4),
    ci,
  };
}

export function compareLoopDesigns(
  baselineResults: BenchmarkResult[],
  candidateResults: BenchmarkResult[],
  metric: keyof BenchmarkMetrics,
): {
  baselineMean: number;
  candidateMean: number;
  delta: number;
  ci: ConfidenceInterval;
  significant: boolean;
} {
  const baselineValues = baselineResults.map((r) => {
    const v = r.metrics[metric];
    return typeof v === "boolean" ? (v ? 1 : 0) : (v as number);
  });
  const candidateValues = candidateResults.map((r) => {
    const v = r.metrics[metric];
    return typeof v === "boolean" ? (v ? 1 : 0) : (v as number);
  });

  const baselineMean =
    baselineValues.length > 0
      ? baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length
      : 0;
  const candidateMean =
    candidateValues.length > 0
      ? candidateValues.reduce((s, v) => s + v, 0) / candidateValues.length
      : 0;

  const minLen = Math.min(baselineValues.length, candidateValues.length);
  const deltas: number[] = [];
  for (let i = 0; i < minLen; i++) {
    deltas.push(candidateValues[i]! - baselineValues[i]!);
  }

  const ci = bootstrapCI(deltas);
  const significant = ci.lower > 0 || ci.upper < 0;

  return {
    baselineMean: ROUND(baselineMean, 4),
    candidateMean: ROUND(candidateMean, 4),
    delta: ROUND(candidateMean - baselineMean, 4),
    ci,
    significant,
  };
}

export function applyLtfMetrics(
  metrics: BenchmarkMetrics,
  ltfSummary: LtfSummary,
  task: TaskDefinition,
): BenchmarkMetrics {
  return {
    ...metrics,
    convergenceRate: computeConvergenceRate(
      ltfSummary.totalIterations,
      task.constraints.max_iterations,
    ),
    verificationAccuracy: computeVerificationAccuracy(
      ltfSummary.verificationPassRate,
    ),
    firstEditDelay: ltfSummary.firstEditDelay,
    contextEfficiency: computeContextEfficiency(
      ltfSummary.totalOutputTokens,
      ltfSummary.totalInputTokens + ltfSummary.totalOutputTokens,
    ),
    recoveryRate: ltfSummary.recoveryRate,
    costUsd: ltfSummary.totalCostUsd || metrics.costUsd,
    iterations: ltfSummary.totalIterations || metrics.iterations,
  };
}

function tfidfCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);

  const allTerms = new Set([...tfA.keys(), ...tfB.keys()]);
  const idf = new Map<string, number>();
  for (const term of allTerms) {
    const docsContaining =
      (tfA.has(term) ? 1 : 0) + (tfB.has(term) ? 1 : 0);
    idf.set(term, Math.log(2 / docsContaining) + 1);
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const a = (tfA.get(term) ?? 0) * (idf.get(term) ?? 1);
    const b = (tfB.get(term) ?? 0) * (idf.get(term) ?? 1);
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;
  return dotProduct / magnitude;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  for (const [k, v] of tf) {
    tf.set(k, v / tokens.length);
  }
  return tf;
}

function isBoilerplate(line: string): boolean {
  return (
    /^import\s/.test(line) ||
    /^from\s/.test(line) ||
    /^export\s/.test(line) ||
    /^\/\//.test(line) ||
    /^#/.test(line) ||
    /^\s*$/.test(line) ||
    line === "{" ||
    line === "}" ||
    line === ")" ||
    line === "]"
  );
}
