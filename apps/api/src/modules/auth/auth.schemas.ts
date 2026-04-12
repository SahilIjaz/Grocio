/**
 * Authentication request/response schemas using Zod
 * All input validation is done here before business logic
 */

import { z } from "zod";
import { UserRole } from "@grocio/types";

/**
 * Register request schema
 * For creating a new user account
 */
export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(80, "First name must be less than 80 characters")
    .trim(),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(80, "Last name must be less than 80 characters")
    .trim(),

  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one digit")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),

  confirmPassword: z.string(),

  tenantName: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(120, "Store name must be less than 120 characters")
    .trim()
    .optional(),
});

/**
 * Register request with password confirmation
 */
export const registerWithConfirmSchema = registerSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export type RegisterRequest = z.infer<typeof registerWithConfirmSchema>;

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;

/**
 * Forgot password request schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password request schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one digit")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),

  confirmPassword: z.string(),
});

export const resetPasswordWithConfirmSchema = resetPasswordSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export type ResetPasswordRequest = z.infer<typeof resetPasswordWithConfirmSchema>;

/**
 * Change password request schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),

  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one digit")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),

  confirmPassword: z.string(),
});

export const changePasswordWithConfirmSchema = changePasswordSchema.refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export type ChangePasswordRequest = z.infer<typeof changePasswordWithConfirmSchema>;

/**
 * Validate and parse a schema
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data or throws ZodError
 */
export const validateSchema = async <T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> => {
  return schema.parseAsync(data);
};
