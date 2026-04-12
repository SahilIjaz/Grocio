// Error handling
export * from "./AppError";
export * from "./asyncHandler";

// Response helpers
export * from "./response";

// JWT utilities
export * from "./jwt";

// Password utilities
export * from "./password";

// Additional utility functions

/**
 * Generate a unique ID for various purposes
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if a string is a valid UUID v4
 */
export const isValidUUID = (value: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Sanitize user input to prevent XSS attacks
 * Basic implementation - in production use dedicated library
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .substring(0, 255);
};

/**
 * Format error for logging (never log sensitive data)
 */
export const formatErrorForLogging = (error: any): Record<string, any> => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return {
    message: String(error),
  };
};
