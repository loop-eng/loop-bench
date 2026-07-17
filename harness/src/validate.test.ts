import { describe, it, expect } from "vitest";
import { validateTask, validateResult } from "./validate.js";

const VALID_TASK = {
  id: "bug-fix-001",
  name: "Wrong return type in utility function",
  category: "bug-fix",
  difficulty: "easy",
  language: "typescript",
  description: "The formatCurrency function returns a number instead of a string.",
  goal: "Fix the return type so formatCurrency returns a string.",
  repo: {
    base_image: "node",
    setup_command: "npm install",
    test_command: "npm test",
    build_command: "npx tsc --noEmit",
  },
  ground_truth: {
    patch_file: "ground-truth/fix.patch",
    files_changed: ["src/utils/format.ts"],
    lines_changed: 3,
  },
  rubric: [
    { criterion: "Return type is string not number", weight: 0.4, check: "ast" },
    { criterion: "No type assertion workarounds", weight: 0.3, check: "grep" },
    { criterion: "All existing tests pass", weight: 0.3, check: "test" },
  ],
  constraints: {
    max_iterations: 20,
    max_cost_usd: 5.0,
    timeout_minutes: 15,
  },
};

const VALID_RESULT = {
  taskId: "bug-fix-001",
  loopDesign: "reflexion",
  model: "claude-sonnet-4-6",
  metrics: {
    resolved: true,
    iterations: 4,
    costUsd: 0.87,
    durationSeconds: 45,
    convergenceRate: 0.2,
    verificationAccuracy: 1.0,
    driftScore: 0.05,
    falseCompletion: false,
    firstEditDelay: 3,
    erosionScore: 0.12,
    verbosityScore: 0.08,
    rubricScore: 0.95,
    honestyScore: 1.0,
    contextEfficiency: 0.34,
    recoveryRate: 0.5,
  },
  ltfTrace: "traces/bug-fix-001-reflexion.ltf.jsonl",
  timestamp: "2026-07-15T10:30:00Z",
};

describe("validateTask", () => {
  it("accepts a valid task", () => {
    const result = validateTask(VALID_TASK);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing required fields", () => {
    const { id: _, ...noId } = VALID_TASK;
    const result = validateTask(noId);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid category", () => {
    const result = validateTask({ ...VALID_TASK, category: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("category"))).toBe(true);
  });

  it("rejects invalid difficulty", () => {
    const result = validateTask({ ...VALID_TASK, difficulty: "extreme" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid language", () => {
    const result = validateTask({ ...VALID_TASK, language: "rust" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid id format", () => {
    const result = validateTask({ ...VALID_TASK, id: "BugFix001" });
    expect(result.valid).toBe(false);
  });

  it("rejects rubric weights not summing to 1.0", () => {
    const badRubric = {
      ...VALID_TASK,
      rubric: [
        { criterion: "Test one criterion here", weight: 0.5, check: "test" as const },
        { criterion: "Test two criterion here", weight: 0.3, check: "grep" as const },
      ],
    };
    const result = validateTask(badRubric);
    expect(result.valid).toBe(false);
    expect(result.errors[0]!.message).toContain("Rubric weights must sum to 1.0");
  });

  it("accepts rubric weights that sum to exactly 1.0", () => {
    const exactRubric = {
      ...VALID_TASK,
      rubric: [
        { criterion: "Exactly half weight here", weight: 0.5, check: "test" as const },
        { criterion: "Other half weight here", weight: 0.5, check: "grep" as const },
      ],
    };
    const result = validateTask(exactRubric);
    expect(result.valid).toBe(true);
  });

  it("rejects empty rubric array", () => {
    const result = validateTask({ ...VALID_TASK, rubric: [] });
    expect(result.valid).toBe(false);
  });

  it("rejects max_iterations of 0", () => {
    const result = validateTask({
      ...VALID_TASK,
      constraints: { ...VALID_TASK.constraints, max_iterations: 0 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects max_cost_usd of 0", () => {
    const result = validateTask({
      ...VALID_TASK,
      constraints: { ...VALID_TASK.constraints, max_cost_usd: 0 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects additional properties", () => {
    const result = validateTask({ ...VALID_TASK, extra: "field" });
    expect(result.valid).toBe(false);
  });

  it("rejects description shorter than 20 chars", () => {
    const result = validateTask({ ...VALID_TASK, description: "Too short" });
    expect(result.valid).toBe(false);
  });

  it("rejects missing test_command in repo", () => {
    const { test_command: _, ...noTest } = VALID_TASK.repo;
    const result = validateTask({ ...VALID_TASK, repo: noTest });
    expect(result.valid).toBe(false);
  });

  it("rejects non-patch ground truth file", () => {
    const result = validateTask({
      ...VALID_TASK,
      ground_truth: { ...VALID_TASK.ground_truth, patch_file: "fix.txt" },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects lines_changed of 0", () => {
    const result = validateTask({
      ...VALID_TASK,
      ground_truth: { ...VALID_TASK.ground_truth, lines_changed: 0 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects empty files_changed array", () => {
    const result = validateTask({
      ...VALID_TASK,
      ground_truth: { ...VALID_TASK.ground_truth, files_changed: [] },
    });
    expect(result.valid).toBe(false);
  });

  it("accepts task without optional build_command", () => {
    const { build_command: _, ...noBuild } = VALID_TASK.repo;
    const result = validateTask({ ...VALID_TASK, repo: noBuild });
    expect(result.valid).toBe(true);
  });
});

describe("validateResult", () => {
  it("accepts a valid result", () => {
    const result = validateResult(VALID_RESULT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing required fields", () => {
    const { taskId: _, ...noTaskId } = VALID_RESULT;
    const result = validateResult(noTaskId);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid taskId format", () => {
    const result = validateResult({ ...VALID_RESULT, taskId: "bad" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid ltfTrace extension", () => {
    const result = validateResult({ ...VALID_RESULT, ltfTrace: "trace.json" });
    expect(result.valid).toBe(false);
  });

  it("rejects missing metrics fields", () => {
    const { resolved: _, ...partialMetrics } = VALID_RESULT.metrics;
    const result = validateResult({ ...VALID_RESULT, metrics: partialMetrics });
    expect(result.valid).toBe(false);
  });

  it("rejects convergenceRate > 1", () => {
    const result = validateResult({
      ...VALID_RESULT,
      metrics: { ...VALID_RESULT.metrics, convergenceRate: 1.5 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects negative costUsd", () => {
    const result = validateResult({
      ...VALID_RESULT,
      metrics: { ...VALID_RESULT.metrics, costUsd: -1 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects negative iterations", () => {
    const result = validateResult({
      ...VALID_RESULT,
      metrics: { ...VALID_RESULT.metrics, iterations: -1 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid timestamp", () => {
    const result = validateResult({ ...VALID_RESULT, timestamp: "not-a-date" });
    expect(result.valid).toBe(false);
  });

  it("rejects additional properties in metrics", () => {
    const result = validateResult({
      ...VALID_RESULT,
      metrics: { ...VALID_RESULT.metrics, extra: 42 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects honestyScore > 1", () => {
    const result = validateResult({
      ...VALID_RESULT,
      metrics: { ...VALID_RESULT.metrics, honestyScore: 1.1 },
    });
    expect(result.valid).toBe(false);
  });

  it("accepts edge case: all metrics at zero", () => {
    const zeroMetrics = {
      resolved: false,
      iterations: 0,
      costUsd: 0,
      durationSeconds: 0,
      convergenceRate: 0,
      verificationAccuracy: 0,
      driftScore: 0,
      falseCompletion: false,
      firstEditDelay: 0,
      erosionScore: 0,
      verbosityScore: 0,
      rubricScore: 0,
      honestyScore: 0,
      contextEfficiency: 0,
      recoveryRate: 0,
    };
    const result = validateResult({
      ...VALID_RESULT,
      metrics: zeroMetrics,
    });
    expect(result.valid).toBe(true);
  });

  it("accepts edge case: all metrics at maximum", () => {
    const maxMetrics = {
      resolved: true,
      iterations: 100,
      costUsd: 50,
      durationSeconds: 3600,
      convergenceRate: 1,
      verificationAccuracy: 1,
      driftScore: 1,
      falseCompletion: true,
      firstEditDelay: 100,
      erosionScore: 1,
      verbosityScore: 1,
      rubricScore: 1,
      honestyScore: 1,
      contextEfficiency: 1,
      recoveryRate: 1,
    };
    const result = validateResult({
      ...VALID_RESULT,
      metrics: maxMetrics,
    });
    expect(result.valid).toBe(true);
  });
});
