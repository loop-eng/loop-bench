import { User, UserRole } from "./user.js";

export enum OrderStatus {
  Pending = "pending",
  Processing = "processing",
  Shipped = "shipped",
  Delivered = "delivered",
  Cancelled = "cancelled",
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdBy: User;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export function createOrder(params: {
  id: string;
  items: OrderItem[];
  createdBy: User;
}): Order {
  const total = params.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return {
    id: params.id,
    items: params.items,
    total,
    status: OrderStatus.Pending,
    createdBy: params.createdBy,
    createdAt: new Date(),
  };
}

export function canCancelOrder(order: Order): boolean {
  if (order.createdBy.role === UserRole.Admin) {
    return true;
  }
  return (
    order.status === OrderStatus.Pending ||
    order.status === OrderStatus.Processing
  );
}
