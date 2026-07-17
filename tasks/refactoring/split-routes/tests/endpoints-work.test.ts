import { describe, it, expect } from "vitest";
import { handleRequest } from "../repo/src/routes";
import type { Request } from "../repo/src/routes";

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

describe("Endpoints still work after refactoring", () => {
  describe("User endpoints", () => {
    it("GET /users returns a list with pagination", () => {
      const res = handleRequest(makeReq("GET", "/users"));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /users/:id returns user details", () => {
      const res = handleRequest(makeReq("GET", "/users/usr-1"));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe("usr-1");
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.email).toBeDefined();
    });

    it("POST /users creates a new user", () => {
      const res = handleRequest(
        makeReq("POST", "/users", {
          name: "Endpoint Test User",
          email: "endpoint-test@example.com",
          role: "user",
        })
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe("Endpoint Test User");
    });

    it("GET /users/:id returns 404 for missing user", () => {
      const res = handleRequest(makeReq("GET", "/users/nonexistent"));
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe("Not Found");
    });
  });

  describe("Product endpoints", () => {
    it("GET /products returns a list with pagination", () => {
      const res = handleRequest(makeReq("GET", "/products"));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();
    });

    it("GET /products/:id returns product details", () => {
      const res = handleRequest(makeReq("GET", "/products/prod-1"));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe("prod-1");
      expect(res.body.data.price).toBeDefined();
    });

    it("POST /products validates required fields", () => {
      const res = handleRequest(
        makeReq("POST", "/products", {
          name: "",
          price: -1,
          category: "invalid",
        })
      );
      expect(res.statusCode).toBe(400);
    });
  });

  describe("Order endpoints", () => {
    it("GET /orders returns a list with pagination", () => {
      const res = handleRequest(makeReq("GET", "/orders"));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("GET /orders/:id returns order with populated references", () => {
      const res = handleRequest(makeReq("GET", "/orders/ord-1"));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe("ord-1");
      expect(res.body.data.userName).toBeDefined();
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items[0].productName).toBeDefined();
    });

    it("POST /orders validates product existence", () => {
      const res = handleRequest(
        makeReq("POST", "/orders", {
          userId: "usr-1",
          items: [{ productId: "nonexistent", quantity: 1 }],
          shippingAddress: "123 Test",
        })
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Routing", () => {
    it("returns 404 for unknown routes", () => {
      const res = handleRequest(makeReq("GET", "/nonexistent"));
      expect(res.statusCode).toBe(404);
    });
  });
});
