import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { MinimalAdapter } from "../../adapters/minimal/adapter.js";
import { ReflexionAdapter } from "../../adapters/reflexion/adapter.js";
import { PlanFirstAdapter } from "../../adapters/plan-first/adapter.js";
import type { LoopRunConfig } from "./types.js";
import { parseLtfTrace, computeLtfSummary } from "./ltf-collector.js";

let testDir: string;
let repoDir: string;
let outputDir: string;

function makeConfig(overrides: Partial<LoopRunConfig> = {}): LoopRunConfig {
  const ltfPath = join(outputDir, "trace.ltf.jsonl");
  return {
    repoPath: repoDir,
    goal: "Fix the bug so all tests pass.",
    testCommand: "echo 'tests passed' && exit 0",
    modelId: "claude-sonnet-4-6",
    constraints: {
      max_iterations: 5,
      max_cost_usd: 1.0,
      timeout_minutes: 1,
    },
    ltfOutputPath: ltfPath,
    ...overrides,
  };
}

beforeEach(() => {
  testDir = join(tmpdir(), `bench-test-${randomUUID()}`);
  repoDir = join(testDir, "repo");
  outputDir = join(testDir, "output");
  mkdirSync(join(repoDir, "src"), { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(repoDir, "src", "index.ts"), "export const x = 1;\n");
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe("MinimalAdapter", () => {
  it("has correct name", () => {
    const adapter = new MinimalAdapter(true);
    expect(adapter.name).toBe("minimal");
  });

  it("runs and produces a result in dry-run mode", async () => {
    const adapter = new MinimalAdapter(true);
    const config = makeConfig();
    const result = await adapter.run(config);

    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.ltfTracePath).toBe(config.ltfOutputPath);
    expect(typeof result.claimedSuccess).toBe("boolean");
    expect(typeof result.terminationReason).toBe("string");
  });

  it("produces valid LTF trace", async () => {
    const adapter = new MinimalAdapter(true);
    const config = makeConfig();
    await adapter.run(config);

    expect(existsSync(config.ltfOutputPath)).toBe(true);
    const events = parseLtfTrace(config.ltfOutputPath);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]!.ltf_version).toBe("1.0");
  });

  it("stops when tests pass", async () => {
    const adapter = new MinimalAdapter(true);
    const config = makeConfig({ testCommand: "exit 0" });
    const result = await adapter.run(config);

    expect(result.claimedSuccess).toBe(true);
    expect(result.terminationReason).toBe("goal_met");
    expect(result.iterations).toBe(1);
  });

  it("iterates when tests fail", async () => {
    const adapter = new MinimalAdapter(true);
    const config = makeConfig({
      testCommand: "exit 1",
      constraints: { max_iterations: 3, max_cost_usd: 1, timeout_minutes: 1 },
    });
    const result = await adapter.run(config);

    expect(result.claimedSuccess).toBe(false);
    expect(result.iterations).toBe(3);
    expect(result.terminationReason).toBe("max_iterations");
  });

  it("respects budget limit", async () => {
    const adapter = new MinimalAdapter(true);
    const config = makeConfig({
      testCommand: "exit 1",
      constraints: { max_iterations: 100, max_cost_usd: 0.005, timeout_minutes: 1 },
    });
    const result = await adapter.run(config);

    expect(result.terminationReason).toBe("budget_exhausted");
    expect(result.iterations).toBeLessThan(100);
  });

  it("LTF trace has terminate and summary events", async () => {
    const adapter = new MinimalAdapter(true);
    const config = makeConfig();
    await adapter.run(config);

    const events = parseLtfTrace(config.ltfOutputPath);
    const terminate = events.find((e) => e.phase === "terminate");
    const summary = events.find((e) => e.type === "loop_summary");

    expect(terminate).toBeDefined();
    expect(summary).toBeDefined();
  });
});

describe("ReflexionAdapter", () => {
  it("has correct name", () => {
    const adapter = new ReflexionAdapter(true);
    expect(adapter.name).toBe("reflexion");
  });

  it("runs in dry-run mode", async () => {
    const adapter = new ReflexionAdapter(true);
    const config = makeConfig();
    const result = await adapter.run(config);

    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.ltfTracePath).toBe(config.ltfOutputPath);
  });

  it("stops on success", async () => {
    const adapter = new ReflexionAdapter(true);
    const config = makeConfig({ testCommand: "exit 0" });
    const result = await adapter.run(config);

    expect(result.claimedSuccess).toBe(true);
    expect(result.terminationReason).toBe("goal_met");
  });

  it("produces LTF events with decide phases on failure", async () => {
    const adapter = new ReflexionAdapter(true);
    const config = makeConfig({
      testCommand: "exit 1",
      constraints: { max_iterations: 2, max_cost_usd: 1, timeout_minutes: 1 },
    });
    await adapter.run(config);

    const events = parseLtfTrace(config.ltfOutputPath);
    const decides = events.filter((e) => e.phase === "decide");
    expect(decides.length).toBeGreaterThanOrEqual(1);
  });

  it("costs more than minimal per iteration (extra reflection call)", async () => {
    const minimal = new MinimalAdapter(true);
    const reflexion = new ReflexionAdapter(true);

    const configFail = makeConfig({
      testCommand: "exit 1",
      constraints: { max_iterations: 2, max_cost_usd: 1, timeout_minutes: 1 },
    });

    const minResult = await minimal.run(configFail);
    const refResult = await reflexion.run({
      ...configFail,
      ltfOutputPath: join(outputDir, "ref-trace.ltf.jsonl"),
    });

    expect(refResult.costUsd).toBeGreaterThan(minResult.costUsd);
  });
});

describe("PlanFirstAdapter", () => {
  it("has correct name", () => {
    const adapter = new PlanFirstAdapter(true);
    expect(adapter.name).toBe("plan-first");
  });

  it("runs in dry-run mode", async () => {
    const adapter = new PlanFirstAdapter(true);
    const config = makeConfig();
    const result = await adapter.run(config);

    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.ltfTracePath).toBe(config.ltfOutputPath);
  });

  it("produces plan events in LTF trace", async () => {
    const adapter = new PlanFirstAdapter(true);
    const config = makeConfig();
    await adapter.run(config);

    const events = parseLtfTrace(config.ltfOutputPath);
    const plans = events.filter((e) => e.phase === "plan");
    expect(plans.length).toBeGreaterThanOrEqual(1);
  });

  it("stops on success", async () => {
    const adapter = new PlanFirstAdapter(true);
    const config = makeConfig({ testCommand: "exit 0" });
    const result = await adapter.run(config);

    expect(result.claimedSuccess).toBe(true);
  });

  it("replans on failure", async () => {
    const adapter = new PlanFirstAdapter(true);
    const config = makeConfig({
      testCommand: "exit 1",
      constraints: { max_iterations: 5, max_cost_usd: 1, timeout_minutes: 1 },
    });
    await adapter.run(config);

    const events = parseLtfTrace(config.ltfOutputPath);
    const plans = events.filter((e) => e.phase === "plan");
    expect(plans.length).toBeGreaterThanOrEqual(2);
  });
});

describe("LTF trace quality", () => {
  it("all adapters produce computable summaries", async () => {
    const adapters = [
      new MinimalAdapter(true),
      new ReflexionAdapter(true),
      new PlanFirstAdapter(true),
    ];

    for (const adapter of adapters) {
      const config = makeConfig({
        ltfOutputPath: join(outputDir, `${adapter.name}.ltf.jsonl`),
      });
      await adapter.run(config);

      const events = parseLtfTrace(config.ltfOutputPath);
      const summary = computeLtfSummary(events, 5);

      expect(summary.totalIterations).toBeGreaterThanOrEqual(1);
      expect(summary.terminationReason).toBeTruthy();
      expect(typeof summary.claimedSuccess).toBe("boolean");
    }
  });
});
