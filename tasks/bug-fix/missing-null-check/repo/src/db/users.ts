export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const users: Map<string, User> = new Map([
  [
    "user-1",
    { id: "user-1", name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  ],
  [
    "user-2",
    { id: "user-2", name: "Bob Smith", email: "bob@example.com", role: "member" },
  ],
  [
    "user-3",
    { id: "user-3", name: "Carol White", email: "carol@example.com", role: "member" },
  ],
]);

/**
 * Find a user by ID. Returns undefined if the user does not exist.
 */
export function findUser(id: string): User | undefined {
  return users.get(id);
}

/**
 * List all users.
 */
export function listUsers(): User[] {
  return Array.from(users.values());
}
