import { readFileSync, existsSync } from "node:fs";

export interface LtfEvent {
  ltf_version: string;
  type?: string;
  loop_id: string;
  timestamp: string;
  phase?: string;
  iteration?: number;
  agent?: { name?: string; role?: string; provider?: string };
  action?: { type?: string; target?: string; detail?: string };
  tokens?: { input?: number; output?: number; cached?: number; cache_write?: number };
  cost_usd?: number;
  duration_ms?: number;
  result?: { status?: string; detail?: string; files_changed?: string[] };
  verification?: { command?: string; exit_code?: number; output_summary?: string };
  metadata?: Record<string, unknown>;
}

export interface LtfSummary {
  totalIterations: number;
  totalCostUsd: number;
  totalDurationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  verificationPassRate: number;
  convergenceRate: number;
  falseCompletion: boolean;
  firstEditDelay: number;
  contextEfficiency: number;
  recoveryRate: number;
  filesChanged: string[];
  claimedSuccess: boolean;
  terminationReason: string;
}

export function parseLtfTrace(filePath: string): LtfEvent[] {
  if (!existsSync(filePath)) return [];

  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const events: LtfEvent[] = [];

  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as LtfEvent);
    } catch {
      // skip malformed lines
    }
  }

  return events;
}

export function computeLtfSummary(
  events: LtfEvent[],
  maxIterations: number,
): LtfSummary {
  let totalCost = 0;
  let totalDuration = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let maxIteration = 0;
  let firstEditIndex = -1;
  const filesSet = new Set<string>();

  let verifyTotal = 0;
  let verifyPass = 0;
  let failures = 0;
  let recoveries = 0;
  let lastVerifyFailed = false;

  let claimedSuccess = false;
  let terminationReason = "unknown";

  const phaseEvents = events.filter((e) => e.phase && !e.type);

  for (let i = 0; i < phaseEvents.length; i++) {
    const event = phaseEvents[i]!;

    if (event.tokens) {
      totalInput += event.tokens.input ?? 0;
      totalOutput += event.tokens.output ?? 0;
    }
    if (event.cost_usd) totalCost += event.cost_usd;
    if (event.duration_ms) totalDuration += event.duration_ms;
    if (event.iteration && event.iteration > maxIteration) {
      maxIteration = event.iteration;
    }

    if (event.result?.files_changed) {
      for (const f of event.result.files_changed) filesSet.add(f);
    }

    if (
      firstEditIndex === -1 &&
      event.phase === "act" &&
      event.action?.type === "file_edit"
    ) {
      firstEditIndex = i;
    }

    if (event.phase === "verify") {
      verifyTotal++;
      const passed = event.result?.status === "success";
      if (passed) {
        verifyPass++;
        if (lastVerifyFailed) recoveries++;
        lastVerifyFailed = false;
      } else {
        failures++;
        lastVerifyFailed = true;
      }
    }

    if (event.phase === "terminate") {
      const reason =
        event.result?.detail ??
        (event.metadata?.termination_reason as string | undefined) ??
        "unknown";
      terminationReason = reason;
      claimedSuccess = reason === "goal_met";
    }
  }

  const summaryEvents = events.filter((e) => e.type === "loop_summary");
  if (summaryEvents.length > 0) {
    const summary = summaryEvents[summaryEvents.length - 1]!;
    const sm = summary as unknown as Record<string, unknown>;
    if (typeof sm.total_iterations === "number") maxIteration = sm.total_iterations;
    if (typeof sm.total_cost_usd === "number") totalCost = sm.total_cost_usd;
    if (typeof sm.total_duration_ms === "number") totalDuration = sm.total_duration_ms;
    if (typeof sm.termination_reason === "string") terminationReason = sm.termination_reason;
    claimedSuccess = terminationReason === "goal_met";
  }

  const iterations = maxIteration || 1;
  const totalTokens = totalInput + totalOutput;

  return {
    totalIterations: iterations,
    totalCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000,
    totalDurationMs: totalDuration,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    verificationPassRate:
      verifyTotal > 0 ? Math.round((verifyPass / verifyTotal) * 1000) / 1000 : 0,
    convergenceRate:
      maxIterations > 0
        ? Math.round((iterations / maxIterations) * 1000) / 1000
        : 1,
    falseCompletion: false,
    firstEditDelay: firstEditIndex >= 0 ? firstEditIndex : phaseEvents.length,
    contextEfficiency:
      totalTokens > 0
        ? Math.round((totalOutput / totalTokens) * 1000) / 1000
        : 0,
    recoveryRate:
      failures > 0
        ? Math.round((recoveries / failures) * 1000) / 1000
        : verifyTotal > 0
          ? 1
          : 0,
    filesChanged: [...filesSet],
    claimedSuccess,
    terminationReason,
  };
}
