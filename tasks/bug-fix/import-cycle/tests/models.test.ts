import { describe, it, expect } from "vitest";
import {
  createUser,
  createOrder,
  UserRole,
  OrderStatus,
  canCancelOrder,
  getUserActiveOrders,
} from "../repo/src/models/index.js";

describe("Cross-module integration (circular import regression)", () => {
  it("should create a user and order without undefined errors", () => {
    const user = createUser({
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
    });

    expect(user).toBeDefined();
    expect(user.role).toBe(UserRole.Customer);

    const order = createOrder({
      id: "o1",
      items: [
        { productId: "p1", name: "Widget", quantity: 2, price: 9.99 },
      ],
      createdBy: user,
    });

    expect(order).toBeDefined();
    expect(order.status).toBe(OrderStatus.Pending);
    expect(order.createdBy).toBe(user);
    expect(order.total).toBeCloseTo(19.98);
  });

  it("should handle user with orders referencing back", () => {
    const user = createUser({
      id: "u2",
      name: "Bob",
      email: "bob@example.com",
      role: UserRole.Admin,
    });

    const order1 = createOrder({
      id: "o1",
      items: [{ productId: "p1", name: "Gadget", quantity: 1, price: 29.99 }],
      createdBy: user,
    });

    const order2 = createOrder({
      id: "o2",
      items: [{ productId: "p2", name: "Doohickey", quantity: 3, price: 4.99 }],
      createdBy: user,
    });

    user.orders.push(order1, order2);

    expect(user.orders).toHaveLength(2);
    expect(user.orders[0].createdBy.name).toBe("Bob");
    expect(user.orders[1].total).toBeCloseTo(14.97);
  });

  it("should allow admin to cancel any order", () => {
    const admin = createUser({
      id: "u3",
      name: "Admin",
      email: "admin@example.com",
      role: UserRole.Admin,
    });

    const order = createOrder({
      id: "o3",
      items: [{ productId: "p1", name: "Item", quantity: 1, price: 100 }],
      createdBy: admin,
    });

    // Force shipped status
    (order as any).status = OrderStatus.Shipped;
    expect(canCancelOrder(order)).toBe(true);
  });

  it("should filter active orders correctly", () => {
    const user = createUser({
      id: "u4",
      name: "Carol",
      email: "carol@example.com",
    });

    const activeOrder = createOrder({
      id: "o4",
      items: [{ productId: "p1", name: "Item", quantity: 1, price: 10 }],
      createdBy: user,
    });

    const cancelledOrder = createOrder({
      id: "o5",
      items: [{ productId: "p2", name: "Item2", quantity: 1, price: 20 }],
      createdBy: user,
    });
    (cancelledOrder as any).status = OrderStatus.Cancelled;

    user.orders.push(activeOrder, cancelledOrder);

    const active = getUserActiveOrders(user);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("o4");
  });

  it("should have no undefined enum values", () => {
    expect(UserRole.Admin).toBe("admin");
    expect(UserRole.Customer).toBe("customer");
    expect(UserRole.Guest).toBe("guest");
    expect(OrderStatus.Pending).toBe("pending");
    expect(OrderStatus.Processing).toBe("processing");
    expect(OrderStatus.Shipped).toBe("shipped");
    expect(OrderStatus.Delivered).toBe("delivered");
    expect(OrderStatus.Cancelled).toBe("cancelled");
  });
});
