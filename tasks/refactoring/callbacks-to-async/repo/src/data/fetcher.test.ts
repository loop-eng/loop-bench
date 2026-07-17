import { describe, it, expect } from "vitest";
import {
  fetchUserWithOrders,
  fetchOrderSummary,
  validateAndFetchUser,
} from "./fetcher.js";
import type { User, Order, ShippingInfo, FetchResult } from "./fetcher.js";

/**
 * Adapter that works with both callback-based and async/await function signatures.
 * If the function returns a Promise, it awaits it.
 * If the function uses a callback (last argument), it wraps it in a Promise.
 */
function callAsync<T>(
  fn: (...args: any[]) => any,
  ...args: any[]
): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, result?: T) => {
      if (err) reject(err);
      else resolve(result as T);
    };
    const maybePromise = fn(...args, callback);
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then((r: T) => resolve(r)).catch((e: Error) => reject(e));
    }
  });
}

describe("fetchUserWithOrders", () => {
  it("should return a result with user, orders, and shipping", async () => {
    const result = await callAsync<
      FetchResult<{ user: User; orders: Order[]; shipping: ShippingInfo[] }>
    >(fetchUserWithOrders, "user-123");

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.user).toEqual({
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    });
    expect(result.data.orders).toHaveLength(2);
    expect(result.data.orders[0].product).toBe("Widget");
    expect(result.data.orders[1].product).toBe("Gadget");
    expect(result.data.shipping).toHaveLength(2);
    expect(result.data.shipping[0].status).toBe("shipped");
    expect(result.timestamp).toBeTypeOf("number");
  });

  it("should include correct order amounts", async () => {
    const result = await callAsync<
      FetchResult<{ user: User; orders: Order[]; shipping: ShippingInfo[] }>
    >(fetchUserWithOrders, "user-456");

    expect(result.data.orders[0].amount).toBe(29.99);
    expect(result.data.orders[1].amount).toBe(49.99);
  });
});

describe("fetchOrderSummary", () => {
  it("should return order with correct total calculation", async () => {
    const result = await callAsync<{
      order: Order;
      shipping: ShippingInfo;
      total: number;
    }>(fetchOrderSummary, "ord-1");

    expect(result).toBeDefined();
    expect(result.order.id).toBe("ord-1");
    expect(result.order.amount).toBe(29.99);
    expect(result.shipping.status).toBe("delivered");

    // total = amount (29.99) + tax (29.99 * 0.08 = 2.3992) + shipping (5.99)
    const expectedTotal = 29.99 + 29.99 * 0.08 + 5.99;
    expect(result.total).toBeCloseTo(expectedTotal, 2);
  });

  it("should include shipping info", async () => {
    const result = await callAsync<{
      order: Order;
      shipping: ShippingInfo;
      total: number;
    }>(fetchOrderSummary, "ord-2");

    expect(result.shipping.address).toBe("123 Main St");
    expect(result.shipping.estimatedDelivery).toBe("2024-01-10");
  });
});

describe("validateAndFetchUser", () => {
  it("should return user for valid email", async () => {
    const result = await callAsync<User>(
      validateAndFetchUser,
      "john@example.com"
    );

    expect(result).toBeDefined();
    expect(result.id).toBe("user-1");
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@example.com");
  });

  it("should return error for invalid email (no @)", async () => {
    await expect(
      callAsync<User>(validateAndFetchUser, "invalid-email")
    ).rejects.toThrow("Invalid email format");
  });

  it("should propagate errors as Error objects", async () => {
    await expect(
      callAsync<User>(validateAndFetchUser, "bad-email")
    ).rejects.toBeInstanceOf(Error);
  });
});
