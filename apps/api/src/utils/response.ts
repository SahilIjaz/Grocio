/**
 * Standard API response helpers
 * All API responses use a consistent envelope format
 */

import { Response } from "express";
import { AppError, isAppError } from "./AppError";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNextPage?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Send a successful response
 * @param res - Express response object
 * @param data - Response data payload
 * @param statusCode - HTTP status code (default: 200)
 * @param meta - Optional metadata (pagination, etc.)
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiSuccessResponse<T>["meta"]
): void => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    error: null,
    ...(meta && { meta }),
  };

  res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param res - Express response object
 * @param error - Error object (AppError or generic Error)
 * @param statusCode - HTTP status code (default: 500)
 */
export const sendError = (
  res: Response,
  error: Error | AppError,
  statusCode: number = 500
): void => {
  let code = "INTERNAL_ERROR";
  let message = "Internal server error";
  let details: Record<string, any> | undefined;

  if (isAppError(error)) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else {
    message = error.message || "Internal server error";
  }

  const response: ApiErrorResponse = {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  res.status(statusCode).json(response);
};

/**
 * Send a response for created resources (201)
 * @param res - Express response object
 * @param data - Created resource data
 * @param meta - Optional metadata
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  meta?: ApiSuccessResponse<T>["meta"]
): void => {
  sendSuccess(res, data, 201, meta);
};

/**
 * Send a paginated response
 * @param res - Express response object
 * @param data - Array of resources
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param statusCode - HTTP status code
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode: number = 200
): void => {
  const hasNextPage = page * limit < total;

  const response: ApiSuccessResponse<T[]> = {
    success: true,
    data,
    error: null,
    meta: {
      page,
      limit,
      total,
      hasNextPage,
    },
  };

  res.status(statusCode).json(response);
};
