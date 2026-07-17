import type { LoopAdapter, LoopRunConfig, LoopRunResult } from "../../harness/src/types.js";
import { LtfWriter } from "../shared/ltf-writer.js";
import { createClient } from "../shared/llm-client.js";
import type { LlmClient } from "../shared/llm-client.js";
import {
  getRepoContext,
  runTests,
  writeFile,
} from "../shared/workspace.js";

const SYSTEM_PROMPT = `You are a code editing agent that learns from its mistakes.
You receive a codebase, a goal, and a history of previous reflections on failed attempts.
Use the reflections to avoid repeating mistakes.

Output ONLY the file edits needed:
FILE: path/to/file.ts
\`\`\`
full file content after edit
\`\`\``;

const REFLECTION_PROMPT = `You are a reflection agent. A code edit was attempted but tests failed.
Analyze what went wrong and what should be done differently.
Be specific about the failure cause and the correction needed.
Keep your reflection under 200 words.`;

export class ReflexionAdapter implements LoopAdapter {
  name = "reflexion";
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
    const reflections: string[] = [];

    while (iteration < config.constraints.max_iterations) {
      iteration++;

      if (totalCost >= config.constraints.max_cost_usd) {
        terminationReason = "budget_exhausted";
        ltf.terminate("budget_exhausted");
        break;
      }

      const context = getRepoContext(config.repoPath);
      const reflectionBlock =
        reflections.length > 0
          ? `\n\nPrevious reflections on failed attempts:\n${reflections.map((r, i) => `[Attempt ${i + 1}] ${r}`).join("\n\n")}`
          : "";

      const response = await this.client.chat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Goal: ${config.goal}\n\nCurrent codebase:\n${context}${reflectionBlock}`,
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
        `Applied ${edits.length} edit(s) with ${reflections.length} prior reflections`,
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

      const reflectionResponse = await this.client.chat(
        [
          { role: "system", content: REFLECTION_PROMPT },
          {
            role: "user",
            content: `Goal: ${config.goal}\n\nTest output:\n${testOutput}\n\nEdits applied:\n${edits.map((e) => `FILE: ${e.path}`).join("\n")}`,
          },
        ],
        config.modelId,
      );

      totalCost += reflectionResponse.costUsd;
      reflections.push(reflectionResponse.content);

      ltf.decide(
        iteration,
        "continue",
        `Reflected on failure: ${reflectionResponse.content.slice(0, 100)}...`,
      );
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

const adapter: LoopAdapter = new ReflexionAdapter(
  process.argv.includes("--dry-run"),
);
export default adapter;
