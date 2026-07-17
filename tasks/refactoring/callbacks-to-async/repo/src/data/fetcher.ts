// Data Fetcher Module
// Uses callback-style async patterns with deeply nested .then() chains.
// This code works correctly but is hard to read and maintain.

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  userId: string;
  product: string;
  amount: number;
}

export interface ShippingInfo {
  orderId: string;
  address: string;
  status: string;
  estimatedDelivery: string;
}

export interface FetchResult<T> {
  data: T;
  timestamp: number;
}

export type Callback<T> = (error: Error | null, result?: T) => void;

// Simulated database/API calls (these use setTimeout internally)
function simulateDbCall<T>(
  data: T,
  shouldFail: boolean = false
): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error("Database connection failed"));
      else resolve(data);
    }, 10);
  });
}

// THE CALLBACK PYRAMID - this is what needs refactoring
export function fetchUserWithOrders(
  userId: string,
  callback: Callback<
    FetchResult<{ user: User; orders: Order[]; shipping: ShippingInfo[] }>
  >
): void {
  // Level 1: Fetch user
  simulateDbCall<User>({
    id: userId,
    name: "John Doe",
    email: "john@example.com",
  })
    .then((user) => {
      // Level 2: Fetch orders for user
      simulateDbCall<Order[]>([
        { id: "ord-1", userId, product: "Widget", amount: 29.99 },
        { id: "ord-2", userId, product: "Gadget", amount: 49.99 },
      ])
        .then((orders) => {
          // Level 3: Fetch shipping for each order
          const shippingPromises = orders.map((order) =>
            simulateDbCall<ShippingInfo>({
              orderId: order.id,
              address: "123 Main St",
              status: "shipped",
              estimatedDelivery: "2024-01-15",
            })
          );
          Promise.all(shippingPromises)
            .then((shipping) => {
              // Level 4: Combine results
              callback(null, {
                data: { user, orders, shipping },
                timestamp: Date.now(),
              });
            })
            .catch((err) => {
              callback(new Error(`Shipping fetch failed: ${err.message}`));
            });
        })
        .catch((err) => {
          callback(new Error(`Orders fetch failed: ${err.message}`));
        });
    })
    .catch((err) => {
      callback(new Error(`User fetch failed: ${err.message}`));
    });
}

// Another deeply nested function
export function fetchOrderSummary(
  orderId: string,
  callback: Callback<{ order: Order; shipping: ShippingInfo; total: number }>
): void {
  simulateDbCall<Order>({
    id: orderId,
    userId: "user-1",
    product: "Widget",
    amount: 29.99,
  })
    .then((order) => {
      simulateDbCall<ShippingInfo>({
        orderId: order.id,
        address: "123 Main St",
        status: "delivered",
        estimatedDelivery: "2024-01-10",
      })
        .then((shipping) => {
          const tax = order.amount * 0.08;
          const shippingCost = 5.99;
          callback(null, {
            order,
            shipping,
            total: order.amount + tax + shippingCost,
          });
        })
        .catch((err) => {
          callback(new Error(`Shipping lookup failed: ${err.message}`));
        });
    })
    .catch((err) => {
      callback(new Error(`Order lookup failed: ${err.message}`));
    });
}

// A third nested function
export function validateAndFetchUser(
  email: string,
  callback: Callback<User>
): void {
  // Validate email format first
  simulateDbCall<boolean>(email.includes("@"))
    .then((isValid) => {
      if (!isValid) {
        callback(new Error("Invalid email format"));
        return;
      }
      simulateDbCall<User[]>([{ id: "user-1", name: "John", email }])
        .then((users) => {
          if (users.length === 0) {
            callback(new Error("User not found"));
            return;
          }
          simulateDbCall<User>(users[0])
            .then((user) => {
              callback(null, user);
            })
            .catch((err) => {
              callback(
                new Error(`User enrichment failed: ${err.message}`)
              );
            });
        })
        .catch((err) => {
          callback(new Error(`User search failed: ${err.message}`));
        });
    })
    .catch((err) => {
      callback(new Error(`Validation failed: ${err.message}`));
    });
}
