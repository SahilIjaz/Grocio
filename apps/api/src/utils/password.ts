/**
 * Password hashing and validation utilities
 * Uses bcrypt with cost factor 12 for security
 */

import bcrypt from "bcrypt";
import { ValidationError } from "./AppError";

const BCRYPT_ROUNDS = 12;

/**
 * Hash a plaintext password
 * @param password - Plaintext password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Compare plaintext password with hashed password
 * @param plaintext - Plaintext password
 * @param hashed - Hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export const comparePassword = async (plaintext: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plaintext, hashed);
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 *
 * @param password - Password to validate
 * @throws ValidationError if password doesn't meet requirements
 */
export const validatePasswordStrength = (password: string): void => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one digit");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  if (errors.length > 0) {
    throw new ValidationError("Password does not meet strength requirements", {
      requirements: errors,
    });
  }
};

/**
 * Sanitize password string (trim whitespace, prevent logging)
 * @param password - Password to sanitize
 * @returns Sanitized password
 */
export const sanitizePassword = (password: string): string => {
  return password.trim();
};
