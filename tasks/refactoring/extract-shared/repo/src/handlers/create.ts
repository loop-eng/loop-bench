import { randomUUID } from "crypto";

export interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  password: string;
}

function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email is required" };
  }
  if (!email.includes("@")) {
    return { valid: false, error: "Email must contain an @ symbol" };
  }
  const domain = email.split("@")[1];
  if (!domain || !domain.includes(".")) {
    return { valid: false, error: "Email domain must contain a dot" };
  }
  return { valid: true };
}

function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }
  if (!/^[a-zA-Z\s\-]+$/.test(name)) {
    return { valid: false, error: "Name must contain only letters, spaces, and hyphens" };
  }
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one digit" };
  }
  return { valid: true };
}

export async function createUser(req: CreateUserRequest) {
  const errors: string[] = [];

  const emailResult = validateEmail(req.email);
  if (!emailResult.valid) errors.push(emailResult.error!);

  const nameResult = validateName(req.name);
  if (!nameResult.valid) errors.push(nameResult.error!);

  const passwordResult = validatePassword(req.password);
  if (!passwordResult.valid) errors.push(passwordResult.error!);

  if (errors.length > 0) {
    return { success: false as const, errors };
  }

  return {
    success: true as const,
    user: {
      id: randomUUID(),
      email: req.email,
      name: req.name,
      role: req.role,
      createdAt: new Date(),
    },
  };
}
