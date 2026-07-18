import { appendFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

export interface LtfWriterOptions {
  outputPath: string;
  loopId?: string;
  sessionId?: string;
  agentName: string;
  agentProvider?: string;
}

export class LtfWriter {
  private readonly outputPath: string;
  private readonly loopId: string;
  private readonly sessionId: string;
  private readonly agentName: string;
  private readonly agentProvider: string;
  private readonly startTime: number;

  constructor(options: LtfWriterOptions) {
    this.outputPath = options.outputPath;
    this.loopId = options.loopId ?? randomUUID();
    this.sessionId = options.sessionId ?? randomUUID();
    this.agentName = options.agentName;
    this.agentProvider = options.agentProvider ?? "anthropic";
    this.startTime = Date.now();

    writeFileSync(this.outputPath, "");
  }

  private write(event: Record<string, unknown>): void {
    const line = JSON.stringify({
      ...event,
      ltf_version: "1.0",
      loop_id: this.loopId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    });
    appendFileSync(this.outputPath, line + "\n");
  }

  plan(iteration: number, detail: string, tokens?: TokenInfo): void {
    this.write({
      phase: "plan",
      iteration,
      agent: { name: this.agentName, role: "planner", provider: this.agentProvider },
      action: { type: "llm_call", detail },
      ...(tokens ? { tokens, cost_usd: tokens.cost } : {}),
    });
  }

  act(
    iteration: number,
    actionType: string,
    target: string,
    detail: string,
    tokens?: TokenInfo,
    filesChanged?: string[],
  ): void {
    this.write({
      phase: "act",
      iteration,
      agent: { name: this.agentName, role: "implementer", provider: this.agentProvider },
      action: { type: actionType, target, detail },
      ...(tokens ? { tokens, cost_usd: tokens.cost } : {}),
      result: {
        status: "success",
        ...(filesChanged ? { files_changed: filesChanged } : {}),
      },
    });
  }

  verify(
    iteration: number,
    command: string,
    exitCode: number,
    outputSummary: string,
    durationMs: number,
  ): void {
    this.write({
      phase: "verify",
      iteration,
      action: { type: "test_run", target: command },
      duration_ms: durationMs,
      result: { status: exitCode === 0 ? "success" : "fail", detail: outputSummary },
      verification: { command, exit_code: exitCode, output_summary: outputSummary },
    });
  }

  decide(iteration: number, decision: string, detail: string): void {
    this.write({
      phase: "decide",
      iteration,
      action: { type: "llm_call", detail },
      result: { status: "success", detail: decision },
    });
  }

  error(iteration: number, detail: string): void {
    this.write({
      phase: "error",
      iteration,
      result: { status: "error", detail },
    });
  }

  terminate(reason: string, detail?: string): void {
    this.write({
      phase: "terminate",
      result: { status: reason === "goal_met" ? "success" : "fail", detail: reason },
      metadata: { termination_reason: reason, ...(detail ? { detail } : {}) },
    });
  }

  summary(
    totalIterations: number,
    terminationReason: string,
    totalTokens: { input: number; output: number; cached: number },
    totalCostUsd: number,
    filesChanged: string[],
    testResults?: { passed: number; failed: number },
  ): void {
    this.write({
      type: "loop_summary",
      started_at: new Date(this.startTime).toISOString(),
      ended_at: new Date().toISOString(),
      total_iterations: totalIterations,
      termination_reason: terminationReason,
      total_tokens: totalTokens,
      total_cost_usd: totalCostUsd,
      total_duration_ms: Date.now() - this.startTime,
      files_changed: filesChanged,
      ...(testResults ? { tests: testResults } : {}),
    });
  }

  getLoopId(): string {
    return this.loopId;
  }
}

export interface TokenInfo {
  input: number;
  output: number;
  cached?: number;
  cost?: number;
}
