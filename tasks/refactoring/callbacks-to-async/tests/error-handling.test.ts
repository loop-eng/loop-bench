import { describe, it, expect } from "vitest";
import {
  fetchUserWithOrders,
  fetchOrderSummary,
  validateAndFetchUser,
} from "../repo/src/data/fetcher.js";

describe("error handling preserved after refactoring", () => {
  describe("fetchUserWithOrders", () => {
    it("should return a result with correct structure", async () => {
      const result = await fetchUserWithOrders("user-1");
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.user).toBeDefined();
      expect(result.data.orders).toBeDefined();
      expect(result.data.shipping).toBeDefined();
      expect(result.timestamp).toBeTypeOf("number");
    });

    it("should include user data in the result", async () => {
      const result = await fetchUserWithOrders("user-1");
      expect(result.data.user.id).toBe("user-1");
      expect(result.data.user.name).toBe("John Doe");
      expect(result.data.user.email).toBe("john@example.com");
    });

    it("should include orders in the result", async () => {
      const result = await fetchUserWithOrders("user-1");
      expect(result.data.orders).toHaveLength(2);
      expect(result.data.orders[0].product).toBe("Widget");
      expect(result.data.orders[1].product).toBe("Gadget");
    });
  });

  describe("fetchOrderSummary", () => {
    it("should return order summary with correct total", async () => {
      const result = await fetchOrderSummary("ord-1");
      expect(result).toBeDefined();
      expect(result.order.amount).toBe(29.99);

      const expectedTotal = 29.99 + 29.99 * 0.08 + 5.99;
      expect(result.total).toBeCloseTo(expectedTotal, 2);
    });

    it("should include shipping info", async () => {
      const result = await fetchOrderSummary("ord-1");
      expect(result.shipping.status).toBe("delivered");
      expect(result.shipping.address).toBe("123 Main St");
    });
  });

  describe("validateAndFetchUser", () => {
    it("should return user for valid email", async () => {
      const user = await validateAndFetchUser("john@example.com");
      expect(user).toBeDefined();
      expect(user.id).toBe("user-1");
      expect(user.name).toBe("John");
    });

    it("should throw error with 'Invalid email format' for emails without @", async () => {
      await expect(validateAndFetchUser("bademail")).rejects.toThrow(
        "Invalid email format"
      );
    });

    it("should throw Error instances, not strings", async () => {
      await expect(validateAndFetchUser("nope")).rejects.toBeInstanceOf(Error);
    });
  });

  describe("error message context prefixes", () => {
    it("should preserve error context in fetchUserWithOrders errors", async () => {
      // The refactored code should still wrap errors with context prefixes
      // We verify by reading the source and checking the error message patterns exist
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const source = readFileSync(
        resolve(__dirname, "../repo/src/data/fetcher.ts"),
        "utf-8"
      );

      expect(source).toContain("User fetch failed:");
      expect(source).toContain("Orders fetch failed:");
      expect(source).toContain("Shipping fetch failed:");
    });

    it("should preserve error context in fetchOrderSummary errors", async () => {
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const source = readFileSync(
        resolve(__dirname, "../repo/src/data/fetcher.ts"),
        "utf-8"
      );

      expect(source).toContain("Order lookup failed:");
      expect(source).toContain("Shipping lookup failed:");
    });

    it("should preserve error context in validateAndFetchUser errors", async () => {
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const source = readFileSync(
        resolve(__dirname, "../repo/src/data/fetcher.ts"),
        "utf-8"
      );

      expect(source).toContain("Invalid email format");
      expect(source).toContain("User not found");
      expect(source).toContain("User enrichment failed:");
      expect(source).toContain("User search failed:");
      expect(source).toContain("Validation failed:");
    });
  });
});
