/**
 * Global error handling middleware
 * Should be the last middleware in the Express app
 * Catches all errors and sends consistent error responses
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClientKnownRequestError, PrismaClientValidationError } from "@prisma/client/runtime/library";
import { ZodError } from "zod";
import {
  AppError,
  isAppError,
  ValidationError,
  ConflictError,
  NotFoundError,
  InternalError,
  formatErrorForLogging,
  sendError,
} from "@/utils";

/**
 * Create error handler middleware
 * @param isDevelopment - Whether in development mode (shows more details)
 * @returns Express error handler middleware
 */
export const createErrorHandler = (isDevelopment: boolean = false) => {
  return (err: Error | AppError, req: Request, res: Response, _next: NextFunction): void => {
    // Log error for debugging
    console.error("Error:", formatErrorForLogging(err));

    let appError: AppError;

    // Handle AppError instances
    if (isAppError(err)) {
      appError = err;
    }
    // Handle Prisma unique constraint violations
    else if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.[0] || "field";
        appError = new ConflictError(`${field} is already in use`);
      }
      // Record not found
      else if (err.code === "P2025") {
        appError = new NotFoundError("Resource not found");
      }
      // Foreign key constraint failure
      else if (err.code === "P2003") {
        appError = new ValidationError("Invalid reference to related resource");
      }
      // Default Prisma error
      else {
        appError = new InternalError("Database operation failed");
      }
    }
    // Handle Prisma validation errors (schema validation)
    else if (err instanceof PrismaClientValidationError) {
      appError = new ValidationError("Invalid database operation");
    }
    // Handle Zod validation errors
    else if (err instanceof ZodError) {
      const details: Record<string, string[]> = {};

      err.errors.forEach((error) => {
        const path = error.path.join(".");
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(error.message);
      });

      appError = new ValidationError("Request validation failed", details);
    }
    // Handle generic JavaScript errors
    else if (err instanceof SyntaxError && "body" in err) {
      // JSON parsing error
      appError = new ValidationError("Invalid JSON in request body");
    }
    // Default to internal error
    else {
      const message = err?.message || "Internal server error";
      appError = new InternalError(isDevelopment ? message : "Internal server error");
    }

    // Send error response
    sendError(res, appError);
  };
};

/**
 * 404 Not Found handler
 * Should be placed after all other routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError("Endpoint not found");
  sendError(res, error, 404);
};

/**
 * Async error wrapper for cleanup
 * Used to ensure errors in async middleware are passed to error handler
 */
export const wrapAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
