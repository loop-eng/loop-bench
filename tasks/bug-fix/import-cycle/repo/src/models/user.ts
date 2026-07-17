import { Order, OrderStatus } from "./order.js";

export enum UserRole {
  Admin = "admin",
  Customer = "customer",
  Guest = "guest",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orders: Order[];
  createdAt: Date;
}

export function createUser(params: {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
}): User {
  return {
    id: params.id,
    name: params.name,
    email: params.email,
    role: params.role ?? UserRole.Customer,
    orders: [],
    createdAt: new Date(),
  };
}

export function getUserActiveOrders(user: User): Order[] {
  return user.orders.filter((o) => o.status !== OrderStatus.Cancelled);
}
