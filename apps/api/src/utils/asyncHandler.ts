/**
 * Wrapper for async route handlers to catch errors
 * Eliminates the need for try-catch in every controller method
 */

import { Request, Response, NextFunction } from "express";

export type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wraps an async controller function to catch errors and pass them to error middleware
 * @param controller - The async controller function
 * @returns Wrapped controller function
 */
export const asyncHandler = (controller: AsyncController): AsyncController => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Alternative syntax using direct wrapper for Express route handlers
 * @example
 * router.post("/endpoint", catchAsyncErrors(async (req, res) => {
 *   // async code here
 * }));
 */
export const catchAsyncErrors = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
