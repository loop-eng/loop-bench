import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fetcherPath = resolve(__dirname, "../repo/src/data/fetcher.ts");
const source = readFileSync(fetcherPath, "utf-8");

describe("uses async/await syntax", () => {
  it("should contain at least 3 async function declarations", () => {
    // Match async function declarations and async arrow functions
    // Patterns: "async function", "= async (", "= async("
    const asyncMatches = source.match(/\basync\b/g) || [];
    expect(asyncMatches.length).toBeGreaterThanOrEqual(3);
  });

  it("should contain at least 5 await expressions", () => {
    const awaitMatches = source.match(/\bawait\b/g) || [];
    expect(awaitMatches.length).toBeGreaterThanOrEqual(5);
  });

  it("should declare fetchUserWithOrders as an async function", () => {
    // Should match: export async function fetchUserWithOrders
    const hasAsyncFetchUser = /export\s+async\s+function\s+fetchUserWithOrders/.test(
      source
    );
    expect(hasAsyncFetchUser).toBe(true);
  });

  it("should declare fetchOrderSummary as an async function", () => {
    const hasAsyncFetchOrder = /export\s+async\s+function\s+fetchOrderSummary/.test(
      source
    );
    expect(hasAsyncFetchOrder).toBe(true);
  });

  it("should declare validateAndFetchUser as an async function", () => {
    const hasAsyncValidate = /export\s+async\s+function\s+validateAndFetchUser/.test(
      source
    );
    expect(hasAsyncValidate).toBe(true);
  });

  it("should use await with simulateDbCall", () => {
    // Check that simulateDbCall is called with await
    const awaitSimulate = source.match(/await\s+simulateDbCall/g) || [];
    // There should be multiple awaited simulateDbCall invocations
    expect(awaitSimulate.length).toBeGreaterThanOrEqual(5);
  });

  it("should use try/catch blocks for error handling", () => {
    const tryBlocks = source.match(/\btry\s*\{/g) || [];
    const catchBlocks = source.match(/\bcatch\s*\(/g) || [];

    // Each of the 3 exported functions should have at least one try/catch
    expect(tryBlocks.length).toBeGreaterThanOrEqual(3);
    expect(catchBlocks.length).toBeGreaterThanOrEqual(3);
  });
});
