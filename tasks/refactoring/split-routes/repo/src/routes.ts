// ============================================================
// routes.ts — Monolithic route handler for users, products, orders
// ============================================================

// ---------- Core types ----------

export interface Request {
  method: string;
  path: string;
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
  headers: Record<string, string>;
}

export interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
  send: (data: string) => void;
  statusCode: number;
  body: any;
}

export type Handler = (req: Request, res: Response) => void | Promise<void>;

export interface Route {
  method: string;
  path: string;
  handler: Handler;
}

// ---------- Domain types ----------

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

// ---------- In-memory data stores ----------

const users: User[] = [
  { id: "usr-1", name: "Alice Johnson", email: "alice@example.com", role: "admin", createdAt: "2024-01-01" },
  { id: "usr-2", name: "Bob Smith", email: "bob@example.com", role: "user", createdAt: "2024-01-02" },
  { id: "usr-3", name: "Carol Williams", email: "carol@example.com", role: "user", createdAt: "2024-01-03" },
  { id: "usr-4", name: "David Brown", email: "david@example.com", role: "moderator", createdAt: "2024-01-04" },
  { id: "usr-5", name: "Eve Davis", email: "eve@example.com", role: "user", createdAt: "2024-01-05" },
];

const products: Product[] = [
  { id: "prod-1", name: "Wireless Keyboard", description: "Ergonomic wireless keyboard with backlit keys", price: 79.99, category: "electronics", stock: 150, createdAt: "2024-01-01" },
  { id: "prod-2", name: "USB-C Hub", description: "7-port USB-C hub with HDMI output", price: 49.99, category: "electronics", stock: 200, createdAt: "2024-01-02" },
  { id: "prod-3", name: "Standing Desk", description: "Adjustable standing desk with memory presets", price: 599.99, category: "furniture", stock: 30, createdAt: "2024-01-03" },
  { id: "prod-4", name: "Monitor Arm", description: "Dual monitor arm with cable management", price: 129.99, category: "furniture", stock: 75, createdAt: "2024-01-04" },
  { id: "prod-5", name: "Noise-Canceling Headphones", description: "Over-ear headphones with active noise cancellation", price: 249.99, category: "electronics", stock: 100, createdAt: "2024-01-05" },
  { id: "prod-6", name: "Desk Lamp", description: "LED desk lamp with adjustable color temperature", price: 39.99, category: "furniture", stock: 0, createdAt: "2024-01-06" },
];

const orders: Order[] = [
  {
    id: "ord-1",
    userId: "usr-1",
    items: [{ productId: "prod-1", quantity: 1, unitPrice: 79.99 }],
    total: 79.99,
    status: "delivered",
    shippingAddress: "123 Main St, Springfield",
    createdAt: "2024-02-01",
    updatedAt: "2024-02-05",
  },
  {
    id: "ord-2",
    userId: "usr-2",
    items: [
      { productId: "prod-2", quantity: 2, unitPrice: 49.99 },
      { productId: "prod-5", quantity: 1, unitPrice: 249.99 },
    ],
    total: 349.97,
    status: "shipped",
    shippingAddress: "456 Oak Ave, Portland",
    createdAt: "2024-02-10",
    updatedAt: "2024-02-12",
  },
  {
    id: "ord-3",
    userId: "usr-3",
    items: [{ productId: "prod-3", quantity: 1, unitPrice: 599.99 }],
    total: 599.99,
    status: "pending",
    shippingAddress: "789 Elm Blvd, Austin",
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
];

// ---------- ID generation ----------

let userCounter = users.length;
let productCounter = products.length;
let orderCounter = orders.length;

function generateUserId(): string {
  userCounter += 1;
  return `usr-${userCounter}`;
}

function generateProductId(): string {
  productCounter += 1;
  return `prod-${productCounter}`;
}

function generateOrderId(): string {
  orderCounter += 1;
  return `ord-${orderCounter}`;
}

// ---------- Validation helpers ----------

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0 && isFinite(value);
}

function parseIntParam(value: string | undefined, defaultVal: number): number {
  if (!value) return defaultVal;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 1 ? defaultVal : parsed;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// USER HANDLERS
// ============================================================

function listUsers(req: Request, res: Response): void {
  const page = parseIntParam(req.query.page, 1);
  const limit = parseIntParam(req.query.limit, 10);
  const roleFilter = req.query.role;

  let filtered = [...users];

  if (roleFilter) {
    filtered = filtered.filter((u) => u.role === roleFilter);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = filtered.slice(startIndex, endIndex);

  res.status(200).json({
    data: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}

function getUser(req: Request, res: Response): void {
  const userId = req.params.id;
  const user = users.find((u) => u.id === userId);

  if (!user) {
    res.status(404).json({
      error: "Not Found",
      message: `User with id '${userId}' does not exist`,
    });
    return;
  }

  res.status(200).json({ data: user });
}

function createUser(req: Request, res: Response): void {
  const { name, email, role } = req.body || {};

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({
      error: "Validation Error",
      message: "Name is required and must be a non-empty string",
    });
    return;
  }

  if (!email || !isValidEmail(email)) {
    res.status(400).json({
      error: "Validation Error",
      message: "A valid email address is required",
    });
    return;
  }

  const emailExists = users.some((u) => u.email === email);
  if (emailExists) {
    res.status(409).json({
      error: "Conflict",
      message: `A user with email '${email}' already exists`,
    });
    return;
  }

  const validRoles = ["admin", "user", "moderator"];
  const assignedRole = role && validRoles.includes(role) ? role : "user";

  const newUser: User = {
    id: generateUserId(),
    name: name.trim(),
    email: email.toLowerCase(),
    role: assignedRole,
    createdAt: getCurrentTimestamp(),
  };

  users.push(newUser);
  res.status(201).json({ data: newUser });
}

function updateUser(req: Request, res: Response): void {
  const userId = req.params.id;
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    res.status(404).json({
      error: "Not Found",
      message: `User with id '${userId}' does not exist`,
    });
    return;
  }

  const updates = req.body || {};
  const user = users[userIndex];

  if (updates.name !== undefined) {
    if (typeof updates.name !== "string" || updates.name.trim().length === 0) {
      res.status(400).json({
        error: "Validation Error",
        message: "Name must be a non-empty string",
      });
      return;
    }
    user.name = updates.name.trim();
  }

  if (updates.email !== undefined) {
    if (!isValidEmail(updates.email)) {
      res.status(400).json({
        error: "Validation Error",
        message: "A valid email address is required",
      });
      return;
    }
    const emailTaken = users.some(
      (u) => u.email === updates.email && u.id !== userId
    );
    if (emailTaken) {
      res.status(409).json({
        error: "Conflict",
        message: `A user with email '${updates.email}' already exists`,
      });
      return;
    }
    user.email = updates.email.toLowerCase();
  }

  if (updates.role !== undefined) {
    const validRoles = ["admin", "user", "moderator"];
    if (!validRoles.includes(updates.role)) {
      res.status(400).json({
        error: "Validation Error",
        message: `Role must be one of: ${validRoles.join(", ")}`,
      });
      return;
    }
    user.role = updates.role;
  }

  users[userIndex] = user;
  res.status(200).json({ data: user });
}

function deleteUser(req: Request, res: Response): void {
  const userId = req.params.id;
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    res.status(404).json({
      error: "Not Found",
      message: `User with id '${userId}' does not exist`,
    });
    return;
  }

  const hasOrders = orders.some((o) => o.userId === userId);
  if (hasOrders) {
    res.status(409).json({
      error: "Conflict",
      message: "Cannot delete a user who has existing orders",
    });
    return;
  }

  users.splice(userIndex, 1);
  res.status(200).json({ message: `User '${userId}' deleted successfully` });
}

// ============================================================
// PRODUCT HANDLERS
// ============================================================

function listProducts(req: Request, res: Response): void {
  const page = parseIntParam(req.query.page, 1);
  const limit = parseIntParam(req.query.limit, 10);
  const categoryFilter = req.query.category;
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
  const sortBy = req.query.sortBy;

  let filtered = [...products];

  if (categoryFilter) {
    filtered = filtered.filter((p) => p.category === categoryFilter);
  }

  if (minPrice !== null && !isNaN(minPrice)) {
    filtered = filtered.filter((p) => p.price >= minPrice);
  }

  if (maxPrice !== null && !isNaN(maxPrice)) {
    filtered = filtered.filter((p) => p.price <= maxPrice);
  }

  if (sortBy === "price_asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = filtered.slice(startIndex, endIndex);

  res.status(200).json({
    data: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}

function getProduct(req: Request, res: Response): void {
  const productId = req.params.id;
  const product = products.find((p) => p.id === productId);

  if (!product) {
    res.status(404).json({
      error: "Not Found",
      message: `Product with id '${productId}' does not exist`,
    });
    return;
  }

  res.status(200).json({ data: product });
}

function createProduct(req: Request, res: Response): void {
  const { name, description, price, category, stock } = req.body || {};

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({
      error: "Validation Error",
      message: "Product name is required and must be a non-empty string",
    });
    return;
  }

  if (!isPositiveNumber(price)) {
    res.status(400).json({
      error: "Validation Error",
      message: "Price must be a positive number",
    });
    return;
  }

  const validCategories = ["electronics", "furniture", "clothing", "books", "food"];
  if (!category || !validCategories.includes(category)) {
    res.status(400).json({
      error: "Validation Error",
      message: `Category must be one of: ${validCategories.join(", ")}`,
    });
    return;
  }

  const initialStock = typeof stock === "number" && stock >= 0 ? Math.floor(stock) : 0;

  const newProduct: Product = {
    id: generateProductId(),
    name: name.trim(),
    description: description || "",
    price: Math.round(price * 100) / 100,
    category,
    stock: initialStock,
    createdAt: getCurrentTimestamp(),
  };

  products.push(newProduct);
  res.status(201).json({ data: newProduct });
}

function updateProduct(req: Request, res: Response): void {
  const productId = req.params.id;
  const productIndex = products.findIndex((p) => p.id === productId);

  if (productIndex === -1) {
    res.status(404).json({
      error: "Not Found",
      message: `Product with id '${productId}' does not exist`,
    });
    return;
  }

  const updates = req.body || {};
  const product = products[productIndex];

  if (updates.name !== undefined) {
    if (typeof updates.name !== "string" || updates.name.trim().length === 0) {
      res.status(400).json({
        error: "Validation Error",
        message: "Product name must be a non-empty string",
      });
      return;
    }
    product.name = updates.name.trim();
  }

  if (updates.description !== undefined) {
    product.description = String(updates.description);
  }

  if (updates.price !== undefined) {
    if (!isPositiveNumber(updates.price)) {
      res.status(400).json({
        error: "Validation Error",
        message: "Price must be a positive number",
      });
      return;
    }
    product.price = Math.round(updates.price * 100) / 100;
  }

  if (updates.stock !== undefined) {
    if (typeof updates.stock !== "number" || updates.stock < 0) {
      res.status(400).json({
        error: "Validation Error",
        message: "Stock must be a non-negative number",
      });
      return;
    }
    product.stock = Math.floor(updates.stock);
  }

  if (updates.category !== undefined) {
    const validCategories = ["electronics", "furniture", "clothing", "books", "food"];
    if (!validCategories.includes(updates.category)) {
      res.status(400).json({
        error: "Validation Error",
        message: `Category must be one of: ${validCategories.join(", ")}`,
      });
      return;
    }
    product.category = updates.category;
  }

  products[productIndex] = product;
  res.status(200).json({ data: product });
}

function deleteProduct(req: Request, res: Response): void {
  const productId = req.params.id;
  const productIndex = products.findIndex((p) => p.id === productId);

  if (productIndex === -1) {
    res.status(404).json({
      error: "Not Found",
      message: `Product with id '${productId}' does not exist`,
    });
    return;
  }

  const referencedInOrders = orders.some((o) =>
    o.items.some((item) => item.productId === productId)
  );

  if (referencedInOrders) {
    res.status(409).json({
      error: "Conflict",
      message: "Cannot delete a product that is referenced in existing orders",
    });
    return;
  }

  products.splice(productIndex, 1);
  res.status(200).json({
    message: `Product '${productId}' deleted successfully`,
  });
}

// ============================================================
// ORDER HANDLERS
// ============================================================

function listOrders(req: Request, res: Response): void {
  const page = parseIntParam(req.query.page, 1);
  const limit = parseIntParam(req.query.limit, 10);
  const statusFilter = req.query.status;
  const userFilter = req.query.userId;
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;

  let filtered = [...orders];

  if (statusFilter) {
    filtered = filtered.filter((o) => o.status === statusFilter);
  }

  if (userFilter) {
    filtered = filtered.filter((o) => o.userId === userFilter);
  }

  if (dateFrom) {
    filtered = filtered.filter((o) => o.createdAt >= dateFrom);
  }

  if (dateTo) {
    filtered = filtered.filter((o) => o.createdAt <= dateTo);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = filtered.slice(startIndex, endIndex);

  res.status(200).json({
    data: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}

function getOrder(req: Request, res: Response): void {
  const orderId = req.params.id;
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    res.status(404).json({
      error: "Not Found",
      message: `Order with id '${orderId}' does not exist`,
    });
    return;
  }

  const populatedItems = order.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      ...item,
      productName: product ? product.name : "Unknown Product",
    };
  });

  const user = users.find((u) => u.id === order.userId);

  res.status(200).json({
    data: {
      ...order,
      items: populatedItems,
      userName: user ? user.name : "Unknown User",
    },
  });
}

function createOrder(req: Request, res: Response): void {
  const { userId, items, shippingAddress } = req.body || {};

  if (!userId || typeof userId !== "string") {
    res.status(400).json({
      error: "Validation Error",
      message: "A valid userId is required",
    });
    return;
  }

  const userExists = users.some((u) => u.id === userId);
  if (!userExists) {
    res.status(404).json({
      error: "Not Found",
      message: `User with id '${userId}' does not exist`,
    });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      error: "Validation Error",
      message: "At least one order item is required",
    });
    return;
  }

  if (!shippingAddress || typeof shippingAddress !== "string") {
    res.status(400).json({
      error: "Validation Error",
      message: "A valid shipping address is required",
    });
    return;
  }

  let total = 0;
  const resolvedItems: OrderItem[] = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      res.status(404).json({
        error: "Not Found",
        message: `Product with id '${item.productId}' does not exist`,
      });
      return;
    }

    const quantity = typeof item.quantity === "number" && item.quantity > 0
      ? Math.floor(item.quantity)
      : 1;

    if (product.stock < quantity) {
      res.status(409).json({
        error: "Insufficient Stock",
        message: `Product '${product.name}' only has ${product.stock} units in stock (requested ${quantity})`,
      });
      return;
    }

    product.stock -= quantity;
    const lineTotal = product.price * quantity;
    total += lineTotal;

    resolvedItems.push({
      productId: product.id,
      quantity,
      unitPrice: product.price,
    });
  }

  const newOrder: Order = {
    id: generateOrderId(),
    userId,
    items: resolvedItems,
    total: Math.round(total * 100) / 100,
    status: "pending",
    shippingAddress,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function updateOrderStatus(req: Request, res: Response): void {
  const orderId = req.params.id;
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    res.status(404).json({
      error: "Not Found",
      message: `Order with id '${orderId}' does not exist`,
    });
    return;
  }

  const { status } = req.body || {};

  const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  const allowed = validTransitions[order.status] || [];

  if (!status || !allowed.includes(status)) {
    res.status(400).json({
      error: "Invalid Transition",
      message: `Cannot transition order from '${order.status}' to '${status}'. Allowed transitions: ${allowed.join(", ") || "none"}`,
    });
    return;
  }

  if (status === "cancelled") {
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        product.stock += item.quantity;
      }
    }
  }

  order.status = status;
  order.updatedAt = getCurrentTimestamp();

  res.status(200).json({ data: order });
}

function cancelOrder(req: Request, res: Response): void {
  const orderId = req.params.id;
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    res.status(404).json({
      error: "Not Found",
      message: `Order with id '${orderId}' does not exist`,
    });
    return;
  }

  const cancellableStatuses = ["pending", "confirmed"];

  if (!cancellableStatuses.includes(order.status)) {
    res.status(400).json({
      error: "Invalid Operation",
      message: `Cannot cancel an order with status '${order.status}'. Only pending or confirmed orders can be cancelled.`,
    });
    return;
  }

  for (const item of order.items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.stock += item.quantity;
    }
  }

  order.status = "cancelled";
  order.updatedAt = getCurrentTimestamp();

  res.status(200).json({
    data: order,
    message: `Order '${orderId}' has been cancelled and stock restored`,
  });
}

// ============================================================
// ROUTE REGISTRATION
// ============================================================

export const routes: Route[] = [
  // User routes
  { method: "GET", path: "/users", handler: listUsers },
  { method: "GET", path: "/users/:id", handler: getUser },
  { method: "POST", path: "/users", handler: createUser },
  { method: "PUT", path: "/users/:id", handler: updateUser },
  { method: "DELETE", path: "/users/:id", handler: deleteUser },

  // Product routes
  { method: "GET", path: "/products", handler: listProducts },
  { method: "GET", path: "/products/:id", handler: getProduct },
  { method: "POST", path: "/products", handler: createProduct },
  { method: "PUT", path: "/products/:id", handler: updateProduct },
  { method: "DELETE", path: "/products/:id", handler: deleteProduct },

  // Order routes
  { method: "GET", path: "/orders", handler: listOrders },
  { method: "GET", path: "/orders/:id", handler: getOrder },
  { method: "POST", path: "/orders", handler: createOrder },
  { method: "PATCH", path: "/orders/:id/status", handler: updateOrderStatus },
  { method: "POST", path: "/orders/:id/cancel", handler: cancelOrder },
];

// ---------- Route matching ----------

function matchRoute(
  method: string,
  path: string
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const routeParts = route.path.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return null;
}

// ---------- Request handling ----------

function parseQueryString(path: string): { cleanPath: string; query: Record<string, string> } {
  const questionIndex = path.indexOf("?");

  if (questionIndex === -1) {
    return { cleanPath: path, query: {} };
  }

  const cleanPath = path.slice(0, questionIndex);
  const queryString = path.slice(questionIndex + 1);
  const query: Record<string, string> = {};

  for (const pair of queryString.split("&")) {
    const [key, value] = pair.split("=");
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
    }
  }

  return { cleanPath, query };
}

export function createResponse(): Response {
  const res: any = { statusCode: 200, body: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
  };
  res.send = (data: string) => {
    res.body = data;
  };
  return res as Response;
}

export function handleRequest(req: Request): Response {
  const { cleanPath, query } = parseQueryString(req.path);
  const result = matchRoute(req.method, cleanPath);
  const res = createResponse();

  if (!result) {
    res.status(404).json({
      error: "Not Found",
      message: `No route matches ${req.method} ${cleanPath}`,
    });
    return res;
  }

  req.params = result.params;
  req.query = { ...query, ...req.query };

  result.route.handler(req, res);

  return res;
}

export function createRouter() {
  return {
    routes,
    handle: handleRequest,
  };
}
