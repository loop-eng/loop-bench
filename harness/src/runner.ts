import { resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import type { TaskDefinition, BenchmarkResult, BenchmarkMetrics } from "./types.js";
import type { LoopAdapter } from "./adapter.js";
import { createEmptyMetrics } from "./metrics.js";
import { Sandbox } from "./docker.js";
import { evaluateTask, applyEvaluation } from "./evaluator.js";
import { parseLtfTrace, computeLtfSummary } from "./ltf-collector.js";
import { resolveTaskDir } from "./loader.js";
import {
  applyLtfMetrics,
  computeDriftScore,
  computeHonestyScore,
  computeFalseCompletion,
} from "./metrics-engine.js";

export interface RunOptions {
  tasks: TaskDefinition[];
  adapter: LoopAdapter;
  modelId: string;
  outputDir: string;
  tasksDir: string;
  useDocker?: boolean;
  onTaskStart?: (task: TaskDefinition, index: number, total: number) => void;
  onTaskEnd?: (task: TaskDefinition, result: BenchmarkResult) => void;
}

export async function runBenchmark(
  options: RunOptions,
): Promise<BenchmarkResult[]> {
  const { tasks, adapter, modelId, outputDir, tasksDir } = options;
  const useDocker = options.useDocker ?? true;
  const results: BenchmarkResult[] = [];

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    options.onTaskStart?.(task, i, tasks.length);

    const result = await runSingleTask(
      task, adapter, modelId, outputDir, tasksDir, useDocker,
    );
    results.push(result);

    options.onTaskEnd?.(task, result);
  }

  return results;
}

async function runSingleTask(
  task: TaskDefinition,
  adapter: LoopAdapter,
  modelId: string,
  outputDir: string,
  tasksDir: string,
  useDocker: boolean,
): Promise<BenchmarkResult> {
  const taskDir = resolveTaskDir(tasksDir, task);
  const tracesDir = resolve(outputDir, "traces");
  if (!existsSync(tracesDir)) mkdirSync(tracesDir, { recursive: true });

  const ltfFileName = `${task.id}-${adapter.name}.ltf.jsonl`;
  const ltfHostPath = resolve(tracesDir, ltfFileName);
  const ltfContainerPath = `/output/${ltfFileName}`;

  let sandbox: Sandbox | null = null;

  try {
    if (useDocker) {
      sandbox = new Sandbox({ task, taskDir, outputDir: tracesDir });
      await sandbox.create();
      await sandbox.start();
      await sandbox.copyRepoIn();
      await sandbox.setup();
    }

    const startTime = Date.now();

    const loopResult = await adapter.run({
      repoPath: useDocker ? "/workspace" : resolve(taskDir, "repo"),
      goal: task.goal,
      testCommand: task.repo.test_command,
      buildCommand: task.repo.build_command,
      modelId,
      constraints: task.constraints,
      ltfOutputPath: useDocker ? ltfContainerPath : ltfHostPath,
    });

    const wallClockMs = Date.now() - startTime;

    let metrics: BenchmarkMetrics = {
      ...createEmptyMetrics(),
      iterations: loopResult.iterations,
      costUsd: loopResult.costUsd,
      durationSeconds: wallClockMs / 1000,
    };

    const ltfEvents = parseLtfTrace(ltfHostPath);
    if (ltfEvents.length > 0) {
      const ltfSummary = computeLtfSummary(ltfEvents, task.constraints.max_iterations);
      metrics = applyLtfMetrics(metrics, ltfSummary, task);
    }

    const evaluation = await evaluateTask(task, sandbox);
    metrics = applyEvaluation(metrics, evaluation);
    metrics.falseCompletion = computeFalseCompletion(
      loopResult.claimedSuccess,
      evaluation.testsPass,
    );
    metrics.honestyScore = computeHonestyScore(
      loopResult.filesChanged,
      task.ground_truth.files_changed,
    );
    metrics.driftScore = computeDriftScore(
      task.ground_truth.files_changed,
      loopResult.filesChanged,
      task.goal,
    );

    return {
      taskId: task.id,
      loopDesign: adapter.name,
      model: modelId,
      metrics,
      ltfTrace: `traces/${ltfFileName}`,
      timestamp: new Date().toISOString(),
    };
  } finally {
    if (sandbox) {
      await sandbox.cleanup();
    }
  }
}
