import { resolve } from "node:path";
import type { TaskDefinition, BenchmarkResult } from "./types.js";
import type { LoopAdapter } from "./adapter.js";
import { createEmptyMetrics } from "./metrics.js";
import { Sandbox } from "./docker.js";

export interface RunOptions {
  tasks: TaskDefinition[];
  adapter: LoopAdapter;
  modelId: string;
  outputDir: string;
  tasksDir: string;
  useDocker?: boolean;
}

export async function runBenchmark(
  options: RunOptions,
): Promise<BenchmarkResult[]> {
  const { tasks, adapter, modelId, outputDir, tasksDir } = options;
  const useDocker = options.useDocker ?? true;
  const results: BenchmarkResult[] = [];

  for (const task of tasks) {
    const result = await runSingleTask(
      task,
      adapter,
      modelId,
      outputDir,
      tasksDir,
      useDocker,
    );
    results.push(result);
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
  const taskDir = resolve(tasksDir, task.category, taskDirName(task.id));
  const ltfOutputPath = resolve(outputDir, `${task.id}-${adapter.name}.ltf.jsonl`);
  let sandbox: Sandbox | null = null;

  try {
    if (useDocker) {
      sandbox = new Sandbox({
        task,
        taskDir,
        outputDir,
      });

      await sandbox.create();
      await sandbox.start();
      await sandbox.copyRepoIn();
      await sandbox.setup();
    }

    const loopResult = await adapter.run({
      repoPath: useDocker ? "/workspace" : resolve(taskDir, "repo"),
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
      ltfTrace: ltfOutputPath,
      timestamp: new Date().toISOString(),
    };
  } finally {
    if (sandbox) {
      await sandbox.cleanup();
    }
  }
}

function taskDirName(taskId: string): string {
  const parts = taskId.split("-");
  return parts.slice(2).join("-") || taskId;
}
