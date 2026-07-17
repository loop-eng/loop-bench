#!/usr/bin/env node

import { Command } from "commander";

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
  .option("-t, --tasks <glob>", "Task glob pattern", "tasks/**/*.yaml")
  .option("-o, --output <dir>", "Output directory", "results")
  .option("--category <cat>", "Filter by category")
  .option("--difficulty <level>", "Filter by difficulty")
  .action((_opts) => {
    console.error("bench run: not yet implemented (Phase 4)");
    process.exit(1);
  });

program
  .command("evaluate")
  .description("Evaluate results from a benchmark run")
  .requiredOption("-r, --results <dir>", "Results directory")
  .action((_opts) => {
    console.error("bench evaluate: not yet implemented (Phase 4)");
    process.exit(1);
  });

program
  .command("report")
  .description("Generate leaderboard report from results")
  .requiredOption("-r, --results <dir>", "Results directory")
  .option("-f, --format <fmt>", "Output format (table|json|csv)", "table")
  .action((_opts) => {
    console.error("bench report: not yet implemented (Phase 4)");
    process.exit(1);
  });

program
  .command("validate")
  .description("Validate task definitions against the schema")
  .argument("[glob]", "Task glob pattern", "tasks/**/*.yaml")
  .action((_glob) => {
    console.error("bench validate: not yet implemented (Phase 1)");
    process.exit(1);
  });

program
  .command("list")
  .description("List available benchmark tasks")
  .option("--category <cat>", "Filter by category")
  .option("--difficulty <level>", "Filter by difficulty")
  .option("--language <lang>", "Filter by language")
  .action((_opts) => {
    console.error("bench list: not yet implemented (Phase 2)");
    process.exit(1);
  });

program.parse();
