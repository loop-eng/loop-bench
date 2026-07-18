import type { LoopAdapter, LoopRunConfig, LoopRunResult } from "../../harness/src/types.js";
import { LtfWriter } from "../shared/ltf-writer.js";
import { createClient } from "../shared/llm-client.js";
import type { LlmClient } from "../shared/llm-client.js";
import {
  getRepoContext,
  runTests,
  writeFile,
} from "../shared/workspace.js";

const PLAN_PROMPT = `You are a planning agent. Analyze the codebase and create a step-by-step plan to accomplish the goal.
Each step should be specific and actionable.
Format your plan as a numbered list:
1. [step description]
2. [step description]
...

Keep the plan under 10 steps. Be specific about which files to modify and what changes to make.`;

const EXECUTE_PROMPT = `You are a code editing agent executing one step of a plan.
You receive the codebase, the full plan, and the specific step to execute now.

Output ONLY the file edits for this step:
FILE: path/to/file.ts
\`\`\`
full file content after edit
\`\`\``;

const REPLAN_PROMPT = `You are a planning agent. The previous plan failed at a step. Tests did not pass.
Analyze the test output and create a revised plan.
Consider what went wrong and adjust the approach.
Format as a numbered list. Keep under 10 steps.`;

export class PlanFirstAdapter implements LoopAdapter {
  name = "plan-first";
  private client: LlmClient;

  constructor(dryRun = false) {
    this.client = createClient(dryRun);
  }

  async run(config: LoopRunConfig): Promise<LoopRunResult> {
    const ltf = new LtfWriter({
      outputPath: config.ltfOutputPath,
      agentName: config.modelId,
    });

    const startTime = Date.now();
    let totalCost = 0;
    let iteration = 0;
    let claimedSuccess = false;
    let terminationReason = "max_iterations";
    const allFilesChanged = new Set<string>();

    const context = getRepoContext(config.repoPath);
    const planResponse = await this.client.chat(
      [
        { role: "system", content: PLAN_PROMPT },
        { role: "user", content: `Goal: ${config.goal}\n\nCodebase:\n${context}` },
      ],
      config.modelId,
    );
    totalCost += planResponse.costUsd;

    let steps = parsePlanSteps(planResponse.content);
    ltf.plan(1, `Created plan with ${steps.length} steps: ${steps.map((s, i) => `${i + 1}. ${s.slice(0, 50)}`).join("; ")}`, {
      input: planResponse.inputTokens,
      output: planResponse.outputTokens,
      cost: planResponse.costUsd,
    });

    let stepIndex = 0;
    let replanCount = 0;
    const maxReplans = 3;

    while (
      iteration < config.constraints.max_iterations &&
      stepIndex < steps.length
    ) {
      iteration++;

      if (totalCost >= config.constraints.max_cost_usd) {
        terminationReason = "budget_exhausted";
        ltf.terminate("budget_exhausted");
        break;
      }

      const currentStep = steps[stepIndex]!;
      const currentContext = getRepoContext(config.repoPath);

      const execResponse = await this.client.chat(
        [
          { role: "system", content: EXECUTE_PROMPT },
          {
            role: "user",
            content: `Goal: ${config.goal}\n\nFull plan:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nExecute step ${stepIndex + 1}: ${currentStep}\n\nCurrent codebase:\n${currentContext}`,
          },
        ],
        config.modelId,
      );

      totalCost += execResponse.costUsd;
      const tokens = {
        input: execResponse.inputTokens,
        output: execResponse.outputTokens,
        cached: execResponse.cachedTokens,
        cost: execResponse.costUsd,
      };

      const edits = parseEdits(execResponse.content);
      const editedFiles: string[] = [];

      for (const edit of edits) {
        writeFile(config.repoPath, edit.path, edit.content);
        editedFiles.push(edit.path);
        allFilesChanged.add(edit.path);
      }

      ltf.act(
        iteration,
        edits.length > 0 ? "file_edit" : "llm_call",
        editedFiles.join(", ") || "none",
        `Step ${stepIndex + 1}/${steps.length}: ${currentStep.slice(0, 80)}`,
        tokens,
        editedFiles,
      );

      const testResult = runTests(config.repoPath, config.testCommand);
      const testOutput = (testResult.stdout + testResult.stderr).slice(-500);
      ltf.verify(
        iteration,
        config.testCommand,
        testResult.exitCode,
        testOutput,
        testResult.durationMs,
      );

      if (testResult.exitCode === 0) {
        stepIndex++;

        if (stepIndex >= steps.length) {
          claimedSuccess = true;
          terminationReason = "goal_met";
          ltf.terminate("goal_met");
          break;
        }

        ltf.decide(
          iteration,
          "continue",
          `Step ${stepIndex} passed, proceeding to step ${stepIndex + 1}`,
        );
      } else {
        replanCount++;
        if (replanCount > maxReplans) {
          terminationReason = "max_iterations";
          ltf.decide(iteration, "stop", "Max replans exceeded");
          ltf.terminate("max_iterations", "Exceeded replan limit");
          break;
        }

        const replanContext = getRepoContext(config.repoPath);
        const replanResponse = await this.client.chat(
          [
            { role: "system", content: REPLAN_PROMPT },
            {
              role: "user",
              content: `Goal: ${config.goal}\n\nFailed at step ${stepIndex + 1}: ${currentStep}\n\nTest output:\n${testOutput}\n\nCurrent codebase:\n${replanContext}`,
            },
          ],
          config.modelId,
        );

        totalCost += replanResponse.costUsd;
        steps = parsePlanSteps(replanResponse.content);
        stepIndex = 0;

        ltf.plan(iteration, `Replanned (attempt ${replanCount}): ${steps.length} steps`, {
          input: replanResponse.inputTokens,
          output: replanResponse.outputTokens,
          cost: replanResponse.costUsd,
        });

        ltf.decide(
          iteration,
          "continue",
          `Tests failed, replanning (attempt ${replanCount}/${maxReplans})`,
        );
      }
    }

    if (
      !claimedSuccess &&
      terminationReason === "max_iterations" &&
      replanCount <= maxReplans
    ) {
      ltf.terminate("max_iterations");
    }

    const filesChanged = [...allFilesChanged];
    ltf.summary(
      iteration,
      terminationReason,
      { input: 0, output: 0, cached: 0 },
      totalCost,
      filesChanged,
    );

    return {
      claimedSuccess,
      terminationReason,
      iterations: iteration,
      costUsd: totalCost,
      durationMs: Date.now() - startTime,
      ltfTracePath: config.ltfOutputPath,
      filesChanged,
    };
  }
}

function parsePlanSteps(planText: string): string[] {
  const lines = planText.split("\n");
  const steps: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*\d+[\.\)]\s*(.+)/);
    if (match && match[1]) {
      steps.push(match[1].trim());
    }
  }

  return steps.length > 0 ? steps : ["Analyze and fix the issue"];
}

interface FileEdit {
  path: string;
  content: string;
}

function parseEdits(response: string): FileEdit[] {
  const edits: FileEdit[] = [];
  const filePattern = /FILE:\s*(.+?)\s*\n```[\w]*\n([\s\S]*?)```/g;
  let match;

  while ((match = filePattern.exec(response)) !== null) {
    const path = match[1]!.trim();
    const content = match[2]!;
    if (path && content) {
      edits.push({ path, content });
    }
  }

  return edits;
}

const adapter: LoopAdapter = new PlanFirstAdapter(
  process.argv.includes("--dry-run"),
);
export default adapter;
