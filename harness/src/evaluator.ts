import type { TaskDefinition, BenchmarkMetrics } from "./types.js";
import type { Sandbox } from "./docker.js";

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
  sandbox: Sandbox | null,
  workspacePath?: string,
): Promise<EvaluationResult> {
  const rubricDetails: RubricResult[] = [];
  let testsPass = false;
  let testsPassed = 0;
  let testsFailed = 0;

  if (sandbox) {
    const testResult = await sandbox.runTests();
    testsPass = testResult.exitCode === 0;
    const counts = parseTestOutput(testResult.stdout + testResult.stderr);
    testsPassed = counts.passed;
    testsFailed = counts.failed;

    for (const criterion of task.rubric) {
      const result = await evaluateRubricCriterion(criterion, sandbox);
      rubricDetails.push(result);
    }
  } else {
    for (const criterion of task.rubric) {
      rubricDetails.push({
        criterion: criterion.criterion,
        weight: criterion.weight,
        passed: false,
        detail: workspacePath
          ? "Evaluated without sandbox"
          : "No sandbox or workspace available",
      });
    }
  }

  const rubricScore = rubricDetails
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + r.weight, 0);

  return {
    testsPass,
    testsPassed,
    testsFailed,
    rubricScore: Math.round(rubricScore * 1000) / 1000,
    rubricDetails,
  };
}

async function evaluateRubricCriterion(
  criterion: { criterion: string; weight: number; check: string },
  sandbox: Sandbox,
): Promise<RubricResult> {
  switch (criterion.check) {
    case "test": {
      const result = await sandbox.runTests();
      return {
        criterion: criterion.criterion,
        weight: criterion.weight,
        passed: result.exitCode === 0,
        detail:
          result.exitCode === 0
            ? "All tests passed"
            : `Tests failed (exit ${result.exitCode})`,
      };
    }

    case "grep": {
      const pattern = extractGrepPattern(criterion.criterion);
      if (!pattern) {
        return {
          criterion: criterion.criterion,
          weight: criterion.weight,
          passed: false,
          detail: "Could not extract grep pattern from criterion",
        };
      }
      const result = await sandbox.exec(
        `grep -rn ${pattern.negate ? "-L" : "-l"} ${JSON.stringify(pattern.pattern)} /workspace/src/ 2>/dev/null`,
        10_000,
      );
      const found = result.stdout.trim().length > 0;
      const passed = pattern.negate ? !found : found;
      return {
        criterion: criterion.criterion,
        weight: criterion.weight,
        passed,
        detail: passed
          ? `Pattern ${pattern.negate ? "not found (good)" : "found"}`
          : `Pattern ${pattern.negate ? "still present" : "not found"}`,
      };
    }

    case "ast": {
      return {
        criterion: criterion.criterion,
        weight: criterion.weight,
        passed: false,
        detail: "AST checks require Phase 5 metrics engine",
      };
    }

    case "manual":
    default: {
      return {
        criterion: criterion.criterion,
        weight: criterion.weight,
        passed: false,
        detail: "Manual evaluation required",
      };
    }
  }
}

interface GrepPattern {
  pattern: string;
  negate: boolean;
}

function extractGrepPattern(criterion: string): GrepPattern | null {
  const lower = criterion.toLowerCase();

  const negateIndicators = [
    "no ", "not ", "never ", "without ", "don't ", "doesn't ",
    "no @ts-ignore", "no type assertion", "no hardcoded",
    "no f-string", "no format()", "no direct import",
    "no string formatting",
  ];

  const negate = negateIndicators.some((ind) => lower.includes(ind));

  const patterns: Record<string, string> = {
    "@ts-ignore": "@ts-ignore",
    "ts-ignore": "@ts-ignore",
    "type assertion": "as any\\|as unknown",
    "f-string": 'f"\\|f\'',
    "format()": "\\.format(",
    "string formatting": "f\"\\|f'\\|\\.format(",
    "hardcoded": "hardcoded",
    "direct import": "from.*\\./",
    "parameterized": "\\?",
    "removelistener": "removeListener\\|removeAllListeners\\|off(",
    "mutex": "mutex\\|lock\\|queue\\|semaphore",
    "base64": "base64\\|b64encode\\|btoa",
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    if (lower.includes(key)) {
      return { pattern, negate };
    }
  }

  return null;
}

function parseTestOutput(output: string): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  const vitestMatch = output.match(/(\d+)\s+passed/);
  if (vitestMatch) passed = parseInt(vitestMatch[1]!, 10);

  const vitestFail = output.match(/(\d+)\s+failed/);
  if (vitestFail) failed = parseInt(vitestFail[1]!, 10);

  const pytestMatch = output.match(/(\d+)\s+passed/);
  if (pytestMatch) passed = Math.max(passed, parseInt(pytestMatch[1]!, 10));

  const pytestFail = output.match(/(\d+)\s+failed/);
  if (pytestFail) failed = Math.max(failed, parseInt(pytestFail[1]!, 10));

  const goMatch = output.match(/ok\s+\S+\s/g);
  if (goMatch) passed = Math.max(passed, goMatch.length);

  const goFail = output.match(/FAIL\s+\S+/g);
  if (goFail) failed = Math.max(failed, goFail.length);

  return { passed, failed };
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
