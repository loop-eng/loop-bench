export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-6": {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
  },
  "claude-sonnet-4-6": {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
  },
  "claude-haiku-4-5": {
    inputPerMillion: 0.8,
    outputPerMillion: 4,
    cacheReadPerMillion: 0.08,
    cacheWritePerMillion: 1,
  },
  "gpt-5.5": {
    inputPerMillion: 2,
    outputPerMillion: 8,
  },
  "gpt-5.2": {
    inputPerMillion: 2.5,
    outputPerMillion: 10,
  },
  "gemini-3.1-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 5,
  },
};

export function getModelPricing(modelId: string): ModelPricing | undefined {
  if (MODEL_PRICING[modelId]) return MODEL_PRICING[modelId];

  const prefix = Object.keys(MODEL_PRICING)
    .sort((a, b) => b.length - a.length)
    .find((key) => modelId.startsWith(key));

  return prefix ? MODEL_PRICING[prefix] : undefined;
}

export function calculateCost(
  modelId: string,
  tokens: { input: number; output: number; cached?: number },
): number {
  const pricing = getModelPricing(modelId);
  if (!pricing) return 0;

  const inputCost = (tokens.input / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (tokens.output / 1_000_000) * pricing.outputPerMillion;
  const cacheCost = tokens.cached
    ? (tokens.cached / 1_000_000) * (pricing.cacheReadPerMillion ?? 0)
    : 0;

  return Math.round((inputCost + outputCost + cacheCost) * 1_000_000) / 1_000_000;
}

export function listSupportedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}
