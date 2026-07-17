import { describe, it, expect, beforeEach } from "vitest";
import { handleRequest, createResponse } from "./routes";
import type { Request, Response } from "./routes";

function makeReq(
  method: string,
  path: string,
  body?: any
): Request {
  return {
    method,
    path,
    params: {},
    body: body ?? null,
    query: {},
    headers: {},
  };
}

// ============================================================
// USER TESTS
// ============================================================

describe("User endpoints", () => {
  it("GET /users returns paginated list", () => {
    const res = handleRequest(makeReq("GET", "/users"));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /users with role filter", () => {
    const res = handleRequest(makeReq("GET", "/users?role=admin"));
    expect(res.statusCode).toBe(200);
    for (const user of res.body.data) {
      expect(user.role).toBe("admin");
    }
  });

  it("GET /users/:id returns a user", () => {
    const res = handleRequest(makeReq("GET", "/users/usr-1"));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe("usr-1");
    expect(res.body.data.name).toBe("Alice Johnson");
  });

  it("GET /users/:id returns 404 for unknown user", () => {
    const res = handleRequest(makeReq("GET", "/users/usr-999"));
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });

  it("POST /users creates a user with valid data", () => {
    const res = handleRequest(
      makeReq("POST", "/users", {
        name: "Frank Test",
        email: "frank@example.com",
        role: "user",
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe("Frank Test");
    expect(res.body.data.email).toBe("frank@example.com");
    expect(res.body.data.id).toBeDefined();
  });

  it("POST /users rejects missing name", () => {
    const res = handleRequest(
      makeReq("POST", "/users", { email: "noname@example.com" })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Validation Error");
  });

  it("POST /users rejects invalid email", () => {
    const res = handleRequest(
      makeReq("POST", "/users", { name: "Test", email: "not-an-email" })
    );
    expect(res.statusCode).toBe(400);
  });

  it("POST /users rejects duplicate email", () => {
    const res = handleRequest(
      makeReq("POST", "/users", {
        name: "Duplicate",
        email: "alice@example.com",
      })
    );
    expect(res.statusCode).toBe(409);
  });

  it("PUT /users/:id updates a user", () => {
    const res = handleRequest(
      makeReq("PUT", "/users/usr-2", { name: "Bob Updated" })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe("Bob Updated");
  });

  it("DELETE /users/:id returns 404 for unknown user", () => {
    const res = handleRequest(makeReq("DELETE", "/users/usr-999"));
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================
// PRODUCT TESTS
// ============================================================

describe("Product endpoints", () => {
  it("GET /products returns paginated list", () => {
    const res = handleRequest(makeReq("GET", "/products"));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it("GET /products with category filter", () => {
    const res = handleRequest(makeReq("GET", "/products?category=electronics"));
    expect(res.statusCode).toBe(200);
    for (const product of res.body.data) {
      expect(product.category).toBe("electronics");
    }
  });

  it("GET /products with price range", () => {
    const res = handleRequest(
      makeReq("GET", "/products?minPrice=50&maxPrice=150")
    );
    expect(res.statusCode).toBe(200);
    for (const product of res.body.data) {
      expect(product.price).toBeGreaterThanOrEqual(50);
      expect(product.price).toBeLessThanOrEqual(150);
    }
  });

  it("GET /products/:id returns a product", () => {
    const res = handleRequest(makeReq("GET", "/products/prod-1"));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe("prod-1");
    expect(res.body.data.name).toBe("Wireless Keyboard");
  });

  it("GET /products/:id returns 404 for unknown product", () => {
    const res = handleRequest(makeReq("GET", "/products/prod-999"));
    expect(res.statusCode).toBe(404);
  });

  it("POST /products creates a product", () => {
    const res = handleRequest(
      makeReq("POST", "/products", {
        name: "Test Widget",
        description: "A test product",
        price: 29.99,
        category: "electronics",
        stock: 50,
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe("Test Widget");
    expect(res.body.data.price).toBe(29.99);
  });

  it("POST /products rejects negative price", () => {
    const res = handleRequest(
      makeReq("POST", "/products", {
        name: "Bad Product",
        price: -10,
        category: "electronics",
      })
    );
    expect(res.statusCode).toBe(400);
  });

  it("DELETE /products/:id rejects if referenced in orders", () => {
    const res = handleRequest(makeReq("DELETE", "/products/prod-1"));
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe("Conflict");
  });
});

// ============================================================
// ORDER TESTS
// ============================================================

describe("Order endpoints", () => {
  it("GET /orders returns paginated list", () => {
    const res = handleRequest(makeReq("GET", "/orders"));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /orders with status filter", () => {
    const res = handleRequest(makeReq("GET", "/orders?status=pending"));
    expect(res.statusCode).toBe(200);
    for (const order of res.body.data) {
      expect(order.status).toBe("pending");
    }
  });

  it("GET /orders/:id returns populated order", () => {
    const res = handleRequest(makeReq("GET", "/orders/ord-1"));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe("ord-1");
    expect(res.body.data.userName).toBeDefined();
    expect(res.body.data.items[0].productName).toBeDefined();
  });

  it("GET /orders/:id returns 404 for unknown order", () => {
    const res = handleRequest(makeReq("GET", "/orders/ord-999"));
    expect(res.statusCode).toBe(404);
  });

  it("POST /orders creates an order with stock check", () => {
    const res = handleRequest(
      makeReq("POST", "/orders", {
        userId: "usr-1",
        items: [{ productId: "prod-4", quantity: 1 }],
        shippingAddress: "123 Test St",
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it("POST /orders rejects unknown product", () => {
    const res = handleRequest(
      makeReq("POST", "/orders", {
        userId: "usr-1",
        items: [{ productId: "prod-999", quantity: 1 }],
        shippingAddress: "123 Test St",
      })
    );
    expect(res.statusCode).toBe(404);
  });

  it("POST /orders rejects out-of-stock product", () => {
    const res = handleRequest(
      makeReq("POST", "/orders", {
        userId: "usr-1",
        items: [{ productId: "prod-6", quantity: 1 }],
        shippingAddress: "123 Test St",
      })
    );
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe("Insufficient Stock");
  });

  it("PATCH /orders/:id/status validates transitions", () => {
    const res = handleRequest(
      makeReq("PATCH", "/orders/ord-3/status", { status: "confirmed" })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("confirmed");
  });

  it("PATCH /orders/:id/status rejects invalid transition", () => {
    // ord-1 is delivered, cannot transition further
    const res = handleRequest(
      makeReq("PATCH", "/orders/ord-1/status", { status: "pending" })
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid Transition");
  });

  it("POST /orders/:id/cancel cancels a pending order", () => {
    // First create a cancellable order
    const createRes = handleRequest(
      makeReq("POST", "/orders", {
        userId: "usr-2",
        items: [{ productId: "prod-4", quantity: 1 }],
        shippingAddress: "456 Cancel St",
      })
    );
    expect(createRes.statusCode).toBe(201);
    const orderId = createRes.body.data.id;

    const cancelRes = handleRequest(
      makeReq("POST", `/orders/${orderId}/cancel`)
    );
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.status).toBe("cancelled");
  });

  it("POST /orders/:id/cancel rejects cancelling a delivered order", () => {
    const res = handleRequest(makeReq("POST", "/orders/ord-1/cancel"));
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid Operation");
  });
});

// ============================================================
// GENERAL ROUTING TESTS
// ============================================================

describe("General routing", () => {
  it("returns 404 for unknown routes", () => {
    const res = handleRequest(makeReq("GET", "/nonexistent"));
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });

  it("returns 404 for wrong HTTP method", () => {
    const res = handleRequest(makeReq("PATCH", "/users"));
    expect(res.statusCode).toBe(404);
  });
});
