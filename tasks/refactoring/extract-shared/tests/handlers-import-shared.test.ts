import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const handlersDir = path.resolve(__dirname, "../repo/src/handlers");

/**
 * Regex patterns that match import statements referencing a shared validation module.
 * Accepts various common paths: shared/validation, common/validation, utils/validation, etc.
 */
const SHARED_IMPORT_PATTERN =
  /import\s+{[^}]*validate[^}]*}\s+from\s+["']\.\.\/(?:shared|common|utils|lib)\/validat(?:ion|ors)["']/;

function readHandlerFile(filename: string): string {
  const filePath = path.join(handlersDir, filename);
  expect(fs.existsSync(filePath), `Handler file ${filename} should exist`).toBe(true);
  return fs.readFileSync(filePath, "utf-8");
}

describe("handlers import from shared module", () => {
  it("create.ts should import validation functions from shared module", () => {
    const content = readHandlerFile("create.ts");
    expect(
      content,
      "create.ts should have an import from a shared validation module"
    ).toMatch(SHARED_IMPORT_PATTERN);
  });

  it("update.ts should import validation functions from shared module", () => {
    const content = readHandlerFile("update.ts");
    expect(
      content,
      "update.ts should have an import from a shared validation module"
    ).toMatch(SHARED_IMPORT_PATTERN);
  });

  it("delete.ts should import validation functions from shared module", () => {
    const content = readHandlerFile("delete.ts");
    expect(
      content,
      "delete.ts should have an import from a shared validation module"
    ).toMatch(SHARED_IMPORT_PATTERN);
  });

  it("create.ts should still export createUser function", () => {
    const content = readHandlerFile("create.ts");
    expect(content).toMatch(/export\s+(async\s+)?function\s+createUser/);
  });

  it("update.ts should still export updateUser function", () => {
    const content = readHandlerFile("update.ts");
    expect(content).toMatch(/export\s+(async\s+)?function\s+updateUser/);
  });

  it("delete.ts should still export deleteUser function", () => {
    const content = readHandlerFile("delete.ts");
    expect(content).toMatch(/export\s+(async\s+)?function\s+deleteUser/);
  });
});
