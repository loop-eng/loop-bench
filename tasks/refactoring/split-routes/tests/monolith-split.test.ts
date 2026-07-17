import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..", "repo");

describe("Monolith has been split", () => {
  it("src/routes.ts should NOT contain handler implementation code", () => {
    const routesPath = resolve(REPO_ROOT, "src", "routes.ts");
    expect(existsSync(routesPath)).toBe(true);

    const content = readFileSync(routesPath, "utf-8");

    // Should not contain in-memory data stores
    expect(content).not.toMatch(/const users:\s*User\[\]\s*=/);
    expect(content).not.toMatch(/const products:\s*Product\[\]\s*=/);
    expect(content).not.toMatch(/const orders:\s*Order\[\]\s*=/);

    // Should not contain handler function definitions
    const handlerFunctions = [
      "listUsers",
      "getUser",
      "createUser",
      "updateUser",
      "deleteUser",
      "listProducts",
      "getProduct",
      "createProduct",
      "updateProduct",
      "deleteProduct",
      "listOrders",
      "getOrder",
      "createOrder",
      "updateOrderStatus",
      "cancelOrder",
    ];

    for (const fn of handlerFunctions) {
      // Should not have function definitions like "function listUsers("
      expect(content).not.toMatch(
        new RegExp(`function\\s+${fn}\\s*\\(`)
      );
    }
  });

  it("src/routes.ts should contain routing setup", () => {
    const routesPath = resolve(REPO_ROOT, "src", "routes.ts");
    const content = readFileSync(routesPath, "utf-8");

    // Should still contain route registration
    expect(content).toMatch(/routes/i);
    expect(content).toMatch(/export/);

    // Should import from sub-modules
    expect(content).toMatch(/import.*from/);
  });

  it("route module files should exist", () => {
    const moduleFiles = [
      "src/routes/users.ts",
      "src/routes/products.ts",
      "src/routes/orders.ts",
    ];

    for (const file of moduleFiles) {
      const filePath = resolve(REPO_ROOT, file);
      expect(
        existsSync(filePath),
        `Expected module file ${file} to exist`
      ).toBe(true);
    }
  });

  it("each module should export handler functions", () => {
    const usersPath = resolve(REPO_ROOT, "src", "routes", "users.ts");
    const productsPath = resolve(REPO_ROOT, "src", "routes", "products.ts");
    const ordersPath = resolve(REPO_ROOT, "src", "routes", "orders.ts");

    const usersContent = readFileSync(usersPath, "utf-8");
    const productsContent = readFileSync(productsPath, "utf-8");
    const ordersContent = readFileSync(ordersPath, "utf-8");

    // Users module should have user-related handlers
    expect(usersContent).toMatch(/export/);
    expect(usersContent).toMatch(/listUsers|getUser|createUser/);

    // Products module should have product-related handlers
    expect(productsContent).toMatch(/export/);
    expect(productsContent).toMatch(/listProducts|getProduct|createProduct/);

    // Orders module should have order-related handlers
    expect(ordersContent).toMatch(/export/);
    expect(ordersContent).toMatch(/listOrders|getOrder|createOrder/);
  });
});
