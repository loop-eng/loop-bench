import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "../repo/src");

const CANDIDATE_PATHS = [
  "shared/validation.ts",
  "common/validation.ts",
  "utils/validation.ts",
  "lib/validation.ts",
  "shared/validators.ts",
  "common/validators.ts",
  "utils/validators.ts",
];

function findSharedModule(): string | null {
  for (const candidate of CANDIDATE_PATHS) {
    const fullPath = path.join(repoRoot, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

describe("shared validation module", () => {
  it("should exist at a standard shared module path", () => {
    const modulePath = findSharedModule();
    expect(
      modulePath,
      `Expected a shared validation module at one of: ${CANDIDATE_PATHS.join(", ")}`
    ).not.toBeNull();
  });

  it("should export a validateEmail function", async () => {
    const modulePath = findSharedModule();
    expect(modulePath).not.toBeNull();

    const content = fs.readFileSync(modulePath!, "utf-8");
    expect(content).toMatch(/export\s+(function\s+validateEmail|{[^}]*validateEmail[^}]*})/);
  });

  it("should export a validateName function", async () => {
    const modulePath = findSharedModule();
    expect(modulePath).not.toBeNull();

    const content = fs.readFileSync(modulePath!, "utf-8");
    expect(content).toMatch(/export\s+(function\s+validateName|{[^}]*validateName[^}]*})/);
  });

  it("validateEmail should return correct result shape", async () => {
    const modulePath = findSharedModule();
    expect(modulePath).not.toBeNull();

    const mod = await import(modulePath!);
    expect(typeof mod.validateEmail).toBe("function");

    const validResult = mod.validateEmail("test@example.com");
    expect(validResult).toHaveProperty("valid");
    expect(typeof validResult.valid).toBe("boolean");
    expect(validResult.valid).toBe(true);

    const invalidResult = mod.validateEmail("");
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult).toHaveProperty("error");
    expect(typeof invalidResult.error).toBe("string");
  });

  it("validateName should return correct result shape", async () => {
    const modulePath = findSharedModule();
    expect(modulePath).not.toBeNull();

    const mod = await import(modulePath!);
    expect(typeof mod.validateName).toBe("function");

    const validResult = mod.validateName("Alice");
    expect(validResult).toHaveProperty("valid");
    expect(typeof validResult.valid).toBe("boolean");
    expect(validResult.valid).toBe(true);

    const invalidResult = mod.validateName("");
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult).toHaveProperty("error");
    expect(typeof invalidResult.error).toBe("string");
  });
});
