import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..", "repo");

const MAX_LINES = 200;

describe("Module size constraints", () => {
  const modules = [
    { name: "users", path: "src/routes/users.ts" },
    { name: "products", path: "src/routes/products.ts" },
    { name: "orders", path: "src/routes/orders.ts" },
  ];

  for (const mod of modules) {
    it(`${mod.name} module should exist`, () => {
      const filePath = resolve(REPO_ROOT, mod.path);
      expect(
        existsSync(filePath),
        `Module file ${mod.path} does not exist`
      ).toBe(true);
    });

    it(`${mod.name} module should be under ${MAX_LINES} lines`, () => {
      const filePath = resolve(REPO_ROOT, mod.path);
      if (!existsSync(filePath)) {
        throw new Error(`Module file ${mod.path} does not exist`);
      }

      const content = readFileSync(filePath, "utf-8");
      const lineCount = content.split("\n").length;

      expect(
        lineCount,
        `${mod.path} has ${lineCount} lines (max ${MAX_LINES})`
      ).toBeLessThanOrEqual(MAX_LINES);
    });
  }

  it("the main routes.ts should be significantly smaller than the original", () => {
    const routesPath = resolve(REPO_ROOT, "src", "routes.ts");
    if (!existsSync(routesPath)) {
      throw new Error("src/routes.ts does not exist");
    }

    const content = readFileSync(routesPath, "utf-8");
    const lineCount = content.split("\n").length;

    // The original was 400+ lines; the refactored router should be well under 150
    expect(
      lineCount,
      `src/routes.ts has ${lineCount} lines — expected it to be a slim routing hub`
    ).toBeLessThanOrEqual(150);
  });
});
