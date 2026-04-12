/**
 * Custom error class hierarchy for the application
 * All errors should extend AppError to ensure consistent error handling
 */

export interface ErrorDetails {
  [key: string]: string | string[] | number | boolean;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: ErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): {
    code: string;
    message: string;
    details?: ErrorDetails;
  } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 - Validation error (input validation failed)
 */
export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: ErrorDetails) {
    super(message, 400, "VALIDATION_ERROR", details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 401 - Authentication error (missing or invalid credentials)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 403 - Authorization error (insufficient permissions)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(message, 403, "FORBIDDEN_ERROR");
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = "Resource",
    id?: string | number
  ) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, "NOT_FOUND_ERROR");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 - Conflict (e.g., duplicate email, unique constraint violation)
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists", details?: ErrorDetails) {
    super(message, 409, "CONFLICT_ERROR", details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 - Unprocessable entity (e.g., insufficient stock, invalid state transition)
 */
export class UnprocessableError extends AppError {
  constructor(message: string = "Cannot process request", details?: ErrorDetails) {
    super(message, 422, "UNPROCESSABLE_ERROR", details);
    Object.setPrototypeOf(this, UnprocessableError.prototype);
  }
}

/**
 * 429 - Too many requests (rate limit exceeded)
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests, please try again later") {
    super(message, 429, "RATE_LIMIT_ERROR");
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 500 - Internal server error
 */
export class InternalError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500, "INTERNAL_ERROR");
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
