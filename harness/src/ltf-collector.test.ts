import { describe, it, expect } from "vitest";
import { parseLtfTrace, computeLtfSummary } from "./ltf-collector.js";
import { resolve } from "node:path";

const LTF_EXAMPLE = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "ltf",
  "spec",
  "v1.0",
  "examples",
  "simple-loop.ltf.jsonl",
);

describe("parseLtfTrace", () => {
  it("returns empty array for non-existent file", () => {
    const events = parseLtfTrace("/nonexistent/file.ltf.jsonl");
    expect(events).toHaveLength(0);
  });

  it("parses inline LTF events", () => {
    const events = parseLtfTrace(LTF_EXAMPLE);
    if (events.length === 0) {
      // LTF repo may not be present in CI — skip gracefully
      return;
    }
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]!.ltf_version).toBe("1.0");
  });
});

describe("computeLtfSummary", () => {
  it("computes summary from phase events", () => {
    const events = [
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:00Z",
        phase: "act",
        iteration: 1,
        action: { type: "file_edit", target: "src/a.ts" },
        tokens: { input: 5000, output: 800 },
        cost_usd: 0.03,
        result: { status: "success", files_changed: ["src/a.ts"] },
      },
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:05Z",
        phase: "verify",
        iteration: 1,
        result: { status: "fail" },
      },
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:10Z",
        phase: "act",
        iteration: 2,
        action: { type: "file_edit", target: "src/a.ts" },
        tokens: { input: 6000, output: 500 },
        cost_usd: 0.025,
      },
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:15Z",
        phase: "verify",
        iteration: 2,
        result: { status: "success" },
      },
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:16Z",
        phase: "terminate",
        result: { status: "success", detail: "goal_met" },
      },
    ];

    const summary = computeLtfSummary(events, 20);

    expect(summary.totalIterations).toBe(2);
    expect(summary.totalCostUsd).toBeCloseTo(0.055, 5);
    expect(summary.verificationPassRate).toBe(0.5);
    expect(summary.convergenceRate).toBe(0.1);
    expect(summary.firstEditDelay).toBe(0);
    expect(summary.recoveryRate).toBe(1);
    expect(summary.claimedSuccess).toBe(true);
    expect(summary.terminationReason).toBe("goal_met");
    expect(summary.filesChanged).toContain("src/a.ts");
  });

  it("handles empty events", () => {
    const summary = computeLtfSummary([], 20);
    expect(summary.totalIterations).toBe(1);
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.claimedSuccess).toBe(false);
  });

  it("computes context efficiency", () => {
    const events = [
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:00Z",
        phase: "act",
        iteration: 1,
        tokens: { input: 8000, output: 2000 },
      },
    ];

    const summary = computeLtfSummary(events, 10);
    expect(summary.contextEfficiency).toBe(0.2);
    expect(summary.totalInputTokens).toBe(8000);
    expect(summary.totalOutputTokens).toBe(2000);
  });

  it("computes first edit delay correctly when edit is not first event", () => {
    const events = [
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:00Z",
        phase: "act",
        iteration: 1,
        action: { type: "search", target: "grep" },
      },
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:01Z",
        phase: "act",
        iteration: 1,
        action: { type: "search", target: "find" },
      },
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:02Z",
        phase: "act",
        iteration: 1,
        action: { type: "file_edit", target: "src/a.ts" },
      },
    ];

    const summary = computeLtfSummary(events, 10);
    expect(summary.firstEditDelay).toBe(2);
  });

  it("uses loop_summary event when present", () => {
    const events = [
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:00Z",
        phase: "act",
        iteration: 1,
      },
      {
        ltf_version: "1.0",
        type: "loop_summary",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:30Z",
        total_iterations: 5,
        total_cost_usd: 1.23,
        total_duration_ms: 30000,
        termination_reason: "goal_met",
      },
    ];

    const summary = computeLtfSummary(events as never[], 20);
    expect(summary.totalIterations).toBe(5);
    expect(summary.totalCostUsd).toBe(1.23);
    expect(summary.totalDurationMs).toBe(30000);
    expect(summary.claimedSuccess).toBe(true);
  });

  it("recoveryRate is 1.0 when no failures occurred", () => {
    const events = [
      {
        ltf_version: "1.0",
        loop_id: "test",
        timestamp: "2026-01-01T00:00:00Z",
        phase: "verify",
        iteration: 1,
        result: { status: "success" },
      },
    ];

    const summary = computeLtfSummary(events, 10);
    expect(summary.recoveryRate).toBe(1);
  });
});
