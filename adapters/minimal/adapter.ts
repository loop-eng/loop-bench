import type { LoopAdapter, LoopRunConfig, LoopRunResult } from "../../harness/src/types.js";
import { LtfWriter } from "../shared/ltf-writer.js";
import { createClient } from "../shared/llm-client.js";
import type { LlmClient } from "../shared/llm-client.js";
import {
  getRepoContext,
  runTests,
  writeFile,
  getChangedFiles,
} from "../shared/workspace.js";

const SYSTEM_PROMPT = `You are a code editing agent. You receive a codebase and a goal.
Output ONLY the file edits needed to accomplish the goal.
Format each edit as:

FILE: path/to/file.ts
\`\`\`
full file content after edit
\`\`\`

Do not explain. Do not add commentary. Just output the edits.`;

export class MinimalAdapter implements LoopAdapter {
  name = "minimal";
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

    while (iteration < config.constraints.max_iterations) {
      iteration++;

      if (totalCost >= config.constraints.max_cost_usd) {
        terminationReason = "budget_exhausted";
        ltf.terminate("budget_exhausted");
        break;
      }

      const context = getRepoContext(config.repoPath);
      const response = await this.client.chat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Goal: ${config.goal}\n\nCurrent codebase:\n${context}`,
          },
        ],
        config.modelId,
      );

      totalCost += response.costUsd;
      const tokens = {
        input: response.inputTokens,
        output: response.outputTokens,
        cached: response.cachedTokens,
        cost: response.costUsd,
      };

      const edits = parseEdits(response.content);
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
        `Applied ${edits.length} edit(s)`,
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
        claimedSuccess = true;
        terminationReason = "goal_met";
        ltf.terminate("goal_met");
        break;
      }

      ltf.decide(iteration, "continue", "Tests failed, retrying");
    }

    if (terminationReason === "max_iterations") {
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

const adapter: LoopAdapter = new MinimalAdapter(
  process.argv.includes("--dry-run"),
);
export default adapter;
