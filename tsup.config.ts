import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "harness/src/index.ts",
    cli: "harness/src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  shims: true,
});
