/**
 * Request validation middleware using Zod
 * Validates request body against provided schema
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "@/utils";

/**
 * Create validation middleware
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validated = await schema.parseAsync(req.body);

      // Replace req.body with validated data
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a readable object
        const details: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });

        throw new ValidationError("Request validation failed", details);
      }

      throw error;
    }
  };
};

/**
 * Validate request query parameters
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.query);
      (req as any).validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });

        throw new ValidationError("Query validation failed", details);
      }

      throw error;
    }
  };
};

/**
 * Validate request params (route parameters)
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.params);
      (req as any).validatedParams = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });

        throw new ValidationError("Route parameter validation failed", details);
      }

      throw error;
    }
  };
};

export default validate;
