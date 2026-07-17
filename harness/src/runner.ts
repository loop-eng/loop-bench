import type { TaskDefinition, BenchmarkResult } from "./types.js";
import type { LoopAdapter } from "./adapter.js";
import { createEmptyMetrics } from "./metrics.js";

export interface RunOptions {
  tasks: TaskDefinition[];
  adapter: LoopAdapter;
  modelId: string;
  outputDir: string;
}

export async function runBenchmark(
  options: RunOptions,
): Promise<BenchmarkResult[]> {
  const { tasks, adapter, modelId, outputDir } = options;
  const results: BenchmarkResult[] = [];

  for (const task of tasks) {
    const result = await runSingleTask(task, adapter, modelId, outputDir);
    results.push(result);
  }

  return results;
}

async function runSingleTask(
  task: TaskDefinition,
  adapter: LoopAdapter,
  modelId: string,
  _outputDir: string,
): Promise<BenchmarkResult> {
  const ltfOutputPath = `traces/${task.id}-${adapter.name}.ltf.jsonl`;

  const loopResult = await adapter.run({
    repoPath: `tasks/${task.category}/${task.id}/repo`,
    goal: task.goal,
    testCommand: task.repo.test_command,
    buildCommand: task.repo.build_command,
    modelId,
    constraints: task.constraints,
    ltfOutputPath,
  });

  const metrics = createEmptyMetrics();
  metrics.resolved = loopResult.claimedSuccess;
  metrics.iterations = loopResult.iterations;
  metrics.costUsd = loopResult.costUsd;
  metrics.durationSeconds = loopResult.durationMs / 1000;

  return {
    taskId: task.id,
    loopDesign: adapter.name,
    model: modelId,
    metrics,
    ltfTrace: loopResult.ltfTracePath,
    timestamp: new Date().toISOString(),
  };
}
