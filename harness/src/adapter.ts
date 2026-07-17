import type { LoopRunConfig, LoopRunResult } from "./types.js";

export interface LoopAdapter {
  name: string;
  run(config: LoopRunConfig): Promise<LoopRunResult>;
}

export async function loadAdapter(adapterPath: string): Promise<LoopAdapter> {
  const mod = (await import(adapterPath)) as { default?: LoopAdapter };
  if (!mod.default) {
    throw new Error(
      `Adapter at ${adapterPath} must export a default LoopAdapter`,
    );
  }
  return mod.default;
}
