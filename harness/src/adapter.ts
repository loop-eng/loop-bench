import type { LoopRunConfig, LoopRunResult } from "./types.js";

export interface LoopAdapter {
  name: string;
  run(config: LoopRunConfig): Promise<LoopRunResult>;
}

export async function loadAdapter(adapterPath: string): Promise<LoopAdapter> {
  const mod = (await import(adapterPath)) as { default?: unknown };
  if (!mod.default) {
    throw new Error(
      `Adapter at ${adapterPath} must export a default LoopAdapter`,
    );
  }

  const adapter = mod.default as Record<string, unknown>;
  if (typeof adapter.name !== "string" || adapter.name.length === 0) {
    throw new Error("Adapter must have a non-empty string 'name' property");
  }
  if (typeof adapter.run !== "function") {
    throw new Error("Adapter must have a 'run' method");
  }

  return adapter as unknown as LoopAdapter;
}
