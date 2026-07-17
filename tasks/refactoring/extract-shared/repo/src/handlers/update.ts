export interface UpdateUserRequest {
  id: string;
  email?: string;
  name?: string;
  role?: string;
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

export async function updateUser(req: UpdateUserRequest) {
  const errors: string[] = [];

  if (req.email !== undefined) {
    const emailResult = validateEmail(req.email);
    if (!emailResult.valid) errors.push(emailResult.error!);
  }

  if (req.name !== undefined) {
    const nameResult = validateName(req.name);
    if (!nameResult.valid) errors.push(nameResult.error!);
  }

  if (errors.length > 0) {
    return { success: false as const, errors };
  }

  return {
    success: true as const,
    user: {
      id: req.id,
      ...(req.email !== undefined && { email: req.email }),
      ...(req.name !== undefined && { name: req.name }),
      ...(req.role !== undefined && { role: req.role }),
      updatedAt: new Date(),
    },
  };
}
