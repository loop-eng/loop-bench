import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const handlersDir = path.resolve(__dirname, "../repo/src/handlers");

/**
 * Patterns that indicate inline validation logic.
 * After extraction, these patterns should NOT appear in handler files
 * because the logic should live in the shared module.
 */
const VALIDATION_BODY_PATTERNS = [
  /\.includes\(["']@["']\)/,                    // email @ check
  /email\.split\(["']@["']\)/,                   // email domain extraction
  /Email domain must contain a dot/,             // email error message
  /Email must contain an @ symbol/,              // email error message
  /\.trim\(\)\.length\s*<\s*2/,                  // name length check
  /Name must be at least 2 characters/,          // name error message
  /Name must contain only letters/,              // name error message
  /\/\^\[a-zA-Z\\s\\-\]\+\$\//,                 // name regex pattern
];

function readHandlerFile(filename: string): string {
  const filePath = path.join(handlersDir, filename);
  expect(fs.existsSync(filePath), `Handler file ${filename} should exist`).toBe(true);
  return fs.readFileSync(filePath, "utf-8");
}

describe("no duplicate validation code", () => {
  it("create.ts should not contain inline validateEmail logic", () => {
    const content = readHandlerFile("create.ts");

    // Should not define its own validateEmail function
    expect(content).not.toMatch(/function\s+validateEmail\s*\(/);

    for (const pattern of VALIDATION_BODY_PATTERNS.slice(0, 4)) {
      expect(
        content,
        `create.ts should not contain pattern: ${pattern}`
      ).not.toMatch(pattern);
    }
  });

  it("update.ts should not contain inline validateEmail logic", () => {
    const content = readHandlerFile("update.ts");

    expect(content).not.toMatch(/function\s+validateEmail\s*\(/);

    for (const pattern of VALIDATION_BODY_PATTERNS.slice(0, 4)) {
      expect(
        content,
        `update.ts should not contain pattern: ${pattern}`
      ).not.toMatch(pattern);
    }
  });

  it("delete.ts should not contain inline validateEmail logic", () => {
    const content = readHandlerFile("delete.ts");

    expect(content).not.toMatch(/function\s+validateEmail\s*\(/);

    for (const pattern of VALIDATION_BODY_PATTERNS.slice(0, 4)) {
      expect(
        content,
        `delete.ts should not contain pattern: ${pattern}`
      ).not.toMatch(pattern);
    }
  });

  it("create.ts should not contain inline validateName logic", () => {
    const content = readHandlerFile("create.ts");

    expect(content).not.toMatch(/function\s+validateName\s*\(/);

    for (const pattern of VALIDATION_BODY_PATTERNS.slice(4)) {
      expect(
        content,
        `create.ts should not contain pattern: ${pattern}`
      ).not.toMatch(pattern);
    }
  });

  it("update.ts should not contain inline validateName logic", () => {
    const content = readHandlerFile("update.ts");

    expect(content).not.toMatch(/function\s+validateName\s*\(/);

    for (const pattern of VALIDATION_BODY_PATTERNS.slice(4)) {
      expect(
        content,
        `update.ts should not contain pattern: ${pattern}`
      ).not.toMatch(pattern);
    }
  });

  it("no handler file should define validatePassword locally", () => {
    const handlers = ["create.ts", "update.ts", "delete.ts"];

    for (const handler of handlers) {
      const content = readHandlerFile(handler);
      expect(
        content,
        `${handler} should not define validatePassword locally`
      ).not.toMatch(/function\s+validatePassword\s*\(/);
    }
  });
});
