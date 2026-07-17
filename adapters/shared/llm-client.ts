export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costUsd: number;
}

export interface LlmClient {
  chat(messages: LlmMessage[], modelId: string): Promise<LlmResponse>;
}

export class DryRunClient implements LlmClient {
  private callCount = 0;

  async chat(messages: LlmMessage[], _modelId: string): Promise<LlmResponse> {
    this.callCount++;
    const lastUser = messages.filter((m) => m.role === "user").pop();
    const prompt = lastUser?.content ?? "";

    if (prompt.includes("plan") || prompt.includes("Plan")) {
      return this.respond(
        "Plan:\n1. Read the relevant source files\n2. Identify the bug\n3. Apply the fix\n4. Run tests to verify",
      );
    }

    if (prompt.includes("reflect") || prompt.includes("Reflect")) {
      return this.respond(
        "Reflection: The previous attempt failed because the fix was incomplete. I need to also update the return type annotation.",
      );
    }

    return this.respond(
      `// dry-run response #${this.callCount}\n// No actual LLM call was made.\n// This adapter requires a real LLM API key to produce meaningful results.`,
    );
  }

  private respond(content: string): LlmResponse {
    return {
      content,
      inputTokens: 500,
      outputTokens: 100,
      cachedTokens: 0,
      costUsd: 0.003,
    };
  }

  getCallCount(): number {
    return this.callCount;
  }
}

export class AnthropicClient implements LlmClient {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  }

  async chat(messages: LlmMessage[], modelId: string): Promise<LlmResponse> {
    if (!this.apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY not set. Use --dry-run or set the environment variable.",
      );
    }
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body = {
      model: modelId,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: chatMsgs,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
    };

    const content = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const cachedTokens = data.usage.cache_read_input_tokens ?? 0;

    const pricing = MODEL_PRICING[modelId] ?? { input: 3, output: 15 };
    const costUsd =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    return { content, inputTokens, outputTokens, cachedTokens, costUsd };
  }
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
  "claude-opus-4-6": { input: 15, output: 75 },
};

export function createClient(dryRun: boolean): LlmClient {
  if (dryRun) return new DryRunClient();
  return new AnthropicClient();
}
