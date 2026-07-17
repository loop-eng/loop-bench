import type { TaskDefinition, BenchmarkMetrics } from "./types.js";

export interface EvaluationResult {
  testsPass: boolean;
  testsPassed: number;
  testsFailed: number;
  rubricScore: number;
  rubricDetails: RubricResult[];
}

export interface RubricResult {
  criterion: string;
  weight: number;
  passed: boolean;
  detail: string;
}

export async function evaluateTask(
  task: TaskDefinition,
  _workspacePath: string,
): Promise<EvaluationResult> {
  const rubricDetails: RubricResult[] = task.rubric.map((r) => ({
    criterion: r.criterion,
    weight: r.weight,
    passed: false,
    detail: "Not yet evaluated",
  }));

  const rubricScore = rubricDetails
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + r.weight, 0);

  return {
    testsPass: false,
    testsPassed: 0,
    testsFailed: 0,
    rubricScore,
    rubricDetails,
  };
}

export function applyEvaluation(
  metrics: BenchmarkMetrics,
  evaluation: EvaluationResult,
): BenchmarkMetrics {
  return {
    ...metrics,
    resolved: evaluation.testsPass,
    rubricScore: evaluation.rubricScore,
  };
}
