export interface DeleteUserRequest {
  id: string;
  confirmEmail: string;
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

export async function deleteUser(req: DeleteUserRequest) {
  const errors: string[] = [];

  const emailResult = validateEmail(req.confirmEmail);
  if (!emailResult.valid) errors.push(emailResult.error!);

  if (errors.length > 0) {
    return { success: false as const, errors };
  }

  return {
    success: true as const,
    deletedId: req.id,
    deletedAt: new Date(),
  };
}
