import { findUser } from "../db/users.js";

export interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Get a user's profile by userId.
 */
export function getUserProfile(userId: string): ApiResponse {
  // BUG: non-null assertion hides the undefined case — crashes at runtime
  const user = findUser(userId)!;

  return {
    status: 200,
    body: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
