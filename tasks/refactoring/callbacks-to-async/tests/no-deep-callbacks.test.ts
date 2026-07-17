import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fetcherPath = resolve(__dirname, "../repo/src/data/fetcher.ts");
const source = readFileSync(fetcherPath, "utf-8");

describe("no deep callback nesting", () => {
  it("should not contain .then() chains nested inside other .then() callbacks", () => {
    // Split into lines and track nesting depth of .then chains
    const lines = source.split("\n");
    let thenDepth = 0;
    let maxThenDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Count opening .then( patterns
      if (trimmed.includes(".then(")) {
        thenDepth++;
        if (thenDepth > maxThenDepth) {
          maxThenDepth = thenDepth;
        }
      }

      // Count closing patterns that end a .then block
      // Look for lines that are just }) or }).catch( which close a .then callback
      if (
        thenDepth > 0 &&
        (trimmed === "});" || trimmed.startsWith("}).catch(") || trimmed === "})")
      ) {
        thenDepth--;
      }
    }

    // After refactoring, there should be no nested .then chains (depth > 1)
    expect(maxThenDepth).toBeLessThanOrEqual(1);
  });

  it("should not have triple-nested .then patterns", () => {
    // Look for the specific anti-pattern: .then inside .then inside .then
    // This regex matches .then( followed eventually by another .then( followed by another .then(
    const thenCount = (source.match(/\.then\s*\(/g) || []).length;

    // A fully refactored file should have at most 0-1 .then() calls
    // (possibly one for Promise.all or internal helper)
    expect(thenCount).toBeLessThanOrEqual(1);
  });

  it("should not have deeply indented callback logic", () => {
    const lines = source.split("\n");
    const codeLines = lines.filter(
      (l) => l.trim().length > 0 && !l.trim().startsWith("//") && !l.trim().startsWith("*")
    );

    // Check that no code line has more than 6 levels of indentation (12 spaces)
    // After async/await refactoring, nesting should be much shallower
    const deeplyNested = codeLines.filter((line) => {
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length ?? 0;
      // Skip lines that are just closing braces/brackets
      const trimmed = line.trim();
      if (trimmed === "}" || trimmed === "});" || trimmed === ");") return false;
      return leadingSpaces > 12;
    });

    // Allow very few deeply indented lines (some object literals may be deep)
    expect(deeplyNested.length).toBeLessThanOrEqual(5);
  });
});
