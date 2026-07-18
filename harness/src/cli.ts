#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import pc from "picocolors";
import type { TaskCategory, Difficulty, Language, BenchmarkResult } from "./types.js";
import { loadTasks } from "./loader.js";
import { loadAdapter } from "./adapter.js";
import { runBenchmark } from "./runner.js";
import { generateReport, formatLeaderboard } from "./report.js";
import { validateResult } from "./validate.js";

const program = new Command();

program
  .name("bench")
  .description(
    "loop-bench — SWE-bench for loop designs. Measure loop architecture quality beyond pass/fail.",
  )
  .version("0.1.0");

program
  .command("run")
  .description("Run benchmark tasks with a loop adapter")
  .requiredOption("-a, --adapter <path>", "Path to loop adapter module")
  .requiredOption("-m, --model <id>", "Model ID to use (held constant)")
  .option("-d, --tasks-dir <dir>", "Tasks directory", "tasks")
  .option("-o, --output <dir>", "Output directory", "results")
  .option("--category <cat>", "Filter by category")
  .option("--difficulty <level>", "Filter by difficulty")
  .option("--language <lang>", "Filter by language")
  .option("--no-docker", "Run without Docker sandboxing")
  .action(async (opts) => {
    try {
      const tasksDir = resolve(opts.tasksDir);
      const outputDir = resolve(opts.output);
      const adapterPath = resolve(opts.adapter);

      const { tasks, errors } = loadTasks({
        tasksDir,
        category: opts.category as TaskCategory | undefined,
        difficulty: opts.difficulty as Difficulty | undefined,
        language: opts.language as Language | undefined,
      });

      if (errors.length > 0) {
        for (const err of errors) {
          console.error(pc.yellow(`Warning: ${err.path}: ${err.message}`));
        }
      }

      if (tasks.length === 0) {
        console.error(pc.red("No tasks found matching filters."));
        process.exit(1);
      }

      console.error(pc.bold(`loop-bench run: ${tasks.length} tasks, model=${opts.model}`));

      const adapter = await loadAdapter(adapterPath);

      const results = await runBenchmark({
        tasks,
        adapter,
        modelId: opts.model,
        outputDir,
        tasksDir,
        useDocker: opts.docker !== false,
        onTaskStart: (task, i, total) => {
          console.error(
            pc.dim(`[${i + 1}/${total}]`) + ` ${task.id} (${task.difficulty})...`,
          );
        },
        onTaskEnd: (task, result) => {
          const icon = result.metrics.resolved ? pc.green("✓") : pc.red("✗");
          console.error(
            `  ${icon} ${task.id}: ${result.metrics.resolved ? "resolved" : "failed"} (${result.metrics.iterations} iters, $${result.metrics.costUsd.toFixed(2)})`,
          );
        },
      });

      if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

      const resultsPath = resolve(outputDir, "results.json");
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.error(pc.green(`\nResults written to ${resultsPath}`));

      const summaries = generateReport(results);
      console.error("\n" + formatLeaderboard(summaries));
    } catch (err) {
      console.error(pc.red(`Error: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

program
  .command("evaluate")
  .description("Evaluate results from a benchmark run")
  .requiredOption("-r, --results <path>", "Path to results.json")
  .action((opts) => {
    try {
      const resultsPath = resolve(opts.results);
      if (!existsSync(resultsPath)) {
        console.error(pc.red(`Results file not found: ${resultsPath}`));
        process.exit(1);
      }

      const raw = readFileSync(resultsPath, "utf-8");
      const results = JSON.parse(raw) as BenchmarkResult[];

      if (results.length === 0) {
        console.error(pc.yellow("No results found in file."));
        return;
      }

      let valid = 0;
      let invalid = 0;

      for (const result of results) {
        const validation = validateResult(result);
        if (validation.valid) {
          valid++;
        } else {
          invalid++;
          console.error(
            pc.red(`✗ ${result.taskId}: `) +
              validation.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
          );
        }
      }

      console.error(
        pc.bold(`\nResults: ${valid} valid, ${invalid} invalid out of ${results.length}`),
      );

      const summaries = generateReport(results);
      const resolved = results.filter((r) => r.metrics.resolved).length;
      console.error(pc.bold(`Pass rate: ${resolved}/${results.length} (${((resolved / results.length) * 100).toFixed(0)}%)`));
      console.error("\n" + formatLeaderboard(summaries));
    } catch (err) {
      console.error(pc.red(`Error: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

program
  .command("report")
  .description("Generate leaderboard report from results")
  .requiredOption("-r, --results <path>", "Path to results.json")
  .option("-f, --format <fmt>", "Output format (table|json|csv)", "table")
  .action((opts) => {
    try {
      const resultsPath = resolve(opts.results);
      if (!existsSync(resultsPath)) {
        console.error(pc.red(`Results file not found: ${resultsPath}`));
        process.exit(1);
      }
      const raw = readFileSync(resultsPath, "utf-8");
      const results = JSON.parse(raw) as BenchmarkResult[];
      const summaries = generateReport(results);

      switch (opts.format) {
        case "json":
          console.log(JSON.stringify(summaries, null, 2));
          break;

        case "csv": {
          console.log(
            "loop_design,model,total,resolved,pass_rate,avg_cost,avg_iterations,avg_drift,avg_honesty,avg_erosion",
          );
          for (const s of summaries) {
            console.log(
              [
                s.loopDesign,
                s.model,
                s.totalTasks,
                s.resolved,
                s.passRate.toFixed(3),
                s.avgCostPerTask.toFixed(4),
                s.avgIterations.toFixed(1),
                s.avgDriftScore.toFixed(3),
                s.avgHonestyScore.toFixed(3),
                s.avgErosionScore.toFixed(3),
              ].join(","),
            );
          }
          break;
        }

        case "table":
        default:
          console.log(formatLeaderboard(summaries));
          break;
      }
    } catch (err) {
      console.error(pc.red(`Error: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate task definitions against the schema")
  .option("-d, --tasks-dir <dir>", "Tasks directory", "tasks")
  .action((opts) => {
    const tasksDir = resolve(opts.tasksDir);
    const { tasks, errors } = loadTasks({ tasksDir });

    if (errors.length > 0) {
      for (const err of errors) {
        console.error(pc.red(`✗ ${err.path}`));
        console.error(pc.dim(`  ${err.message}`));
      }
    }

    for (const task of tasks) {
      console.error(
        pc.green(`✓ ${task.id}`) +
          pc.dim(` (${task.category}, ${task.difficulty}, ${task.language})`),
      );
    }

    console.error(
      pc.bold(
        `\n${tasks.length} valid, ${errors.length} invalid`,
      ),
    );

    if (errors.length > 0) process.exit(1);
  });

program
  .command("list")
  .description("List available benchmark tasks")
  .option("-d, --tasks-dir <dir>", "Tasks directory", "tasks")
  .option("--category <cat>", "Filter by category")
  .option("--difficulty <level>", "Filter by difficulty")
  .option("--language <lang>", "Filter by language")
  .option("--json", "Output as JSON")
  .action((opts) => {
    const tasksDir = resolve(opts.tasksDir);
    const { tasks, errors } = loadTasks({
      tasksDir,
      category: opts.category as TaskCategory | undefined,
      difficulty: opts.difficulty as Difficulty | undefined,
      language: opts.language as Language | undefined,
    });

    if (errors.length > 0) {
      for (const err of errors) {
        console.error(pc.yellow(`Warning: ${err.path}: ${err.message}`));
      }
    }

    if (opts.json) {
      console.log(
        JSON.stringify(
          tasks.map((t) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            difficulty: t.difficulty,
            language: t.language,
          })),
          null,
          2,
        ),
      );
    } else {
      const header = [
        "ID".padEnd(16),
        "Name".padEnd(45),
        "Cat".padEnd(13),
        "Diff".padEnd(8),
        "Lang".padEnd(12),
      ].join(" ");
      console.log(header);
      console.log("-".repeat(header.length));

      for (const t of tasks) {
        console.log(
          [
            t.id.padEnd(16),
            t.name.slice(0, 44).padEnd(45),
            t.category.padEnd(13),
            t.difficulty.padEnd(8),
            t.language.padEnd(12),
          ].join(" "),
        );
      }

      console.error(pc.dim(`\n${tasks.length} task(s) found`));
    }
  });

program
  .command("init")
  .description("Scaffold a custom loop adapter")
  .argument("<name>", "Adapter name (e.g., my-loop)")
  .option("-d, --dir <dir>", "Output directory", ".")
  .action((name: string, opts) => {
    const dir = resolve(opts.dir, name);
    if (existsSync(dir)) {
      console.error(pc.red(`Directory already exists: ${dir}`));
      process.exit(1);
    }

    mkdirSync(dir, { recursive: true });

    const adapterCode = `import type { LoopAdapter, LoopRunConfig, LoopRunResult } from "@loop-eng/bench";

export class ${toPascalCase(name)}Adapter implements LoopAdapter {
  name = "${name}";

  async run(config: LoopRunConfig): Promise<LoopRunResult> {
    const startTime = Date.now();
    let iteration = 0;
    let claimedSuccess = false;
    let terminationReason = "max_iterations";

    while (iteration < config.constraints.max_iterations) {
      iteration++;

      // TODO: Your loop logic here
      // 1. Call your LLM with config.goal and repo context
      // 2. Apply code changes to config.repoPath
      // 3. Run tests: config.testCommand
      // 4. If tests pass, set claimedSuccess = true and break
      // 5. Otherwise, decide whether to continue or stop

      break; // Remove this — placeholder to prevent infinite loop
    }

    return {
      claimedSuccess,
      terminationReason,
      iterations: iteration,
      costUsd: 0,
      durationMs: Date.now() - startTime,
      ltfTracePath: config.ltfOutputPath,
      filesChanged: [],
    };
  }
}

const adapter: LoopAdapter = new ${toPascalCase(name)}Adapter();
export default adapter;
`;

    const pkgJson = JSON.stringify(
      {
        name: `loop-adapter-${name}`,
        version: "0.1.0",
        private: true,
        type: "module",
        main: "adapter.ts",
        dependencies: { "@loop-eng/bench": "^0.1.0" },
        devDependencies: { typescript: "^5.8.0" },
      },
      null,
      2,
    );

    writeFileSync(resolve(dir, "adapter.ts"), adapterCode);
    writeFileSync(resolve(dir, "package.json"), pkgJson);
    writeFileSync(
      resolve(dir, "README.md"),
      `# ${name}\n\nA custom loop adapter for [loop-bench](https://github.com/loop-eng/loop-bench).\n\n## Usage\n\n\`\`\`bash\nbench run --adapter ./${name}/adapter.ts --model claude-sonnet-4-6\n\`\`\`\n`,
    );

    console.error(pc.green(`Adapter scaffolded at ${dir}/`));
    console.error(pc.dim("  adapter.ts   — your loop implementation"));
    console.error(pc.dim("  package.json — adapter metadata"));
    console.error(pc.dim("  README.md    — usage instructions"));
    console.error(
      pc.bold("\nNext: edit adapter.ts with your loop logic, then run:"),
    );
    console.error(
      pc.cyan(`  bench run --adapter ${dir}/adapter.ts --model claude-sonnet-4-6`),
    );
  });

program.parse();

function toPascalCase(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
