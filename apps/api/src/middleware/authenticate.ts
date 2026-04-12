/**
 * JWT authentication middleware
 * Verifies Bearer token, checks blacklist, and attaches user to request
 */

import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { extractTokenFromHeader, verifyToken, AuthenticationError } from "@/utils";
import { JWTPayload } from "@/utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & { token: string };
      tenantId?: string | null;
    }
  }
}

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

/**
 * Create authentication middleware
 * @param redis - Redis client for blacklist check
 * @param publicKey - JWT public key (RS256)
 * @returns Express middleware function
 */
export const createAuthenticateMiddleware = (redis: Redis, publicKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Allow public routes to pass through
    if (PUBLIC_ROUTES.some((route) => req.path.startsWith(route))) {
      return next();
    }

    try {
      // Extract token from Authorization header
      const token = extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        throw new AuthenticationError("Authorization token is required");
      }

      // Verify token signature and expiration
      const decoded = verifyToken(token, publicKey);

      // Check if token is blacklisted (revoked)
      const isBlacklisted = await redis.exists(`blacklist:jti:${decoded.jti}`);
      if (isBlacklisted === 1) {
        throw new AuthenticationError("Token has been revoked");
      }

      // Attach decoded token and original token to request
      (req as any).user = {
        ...decoded,
        token, // Keep original token for logout
      };

      // Attach tenantId from token to request context
      (req as any).tenantId = decoded.tenantId;

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          data: null,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: error.message,
          },
        });
      }

      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Authentication failed",
        },
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't require it
 * Useful for routes that work with or without authentication (e.g., public product listing)
 */
export const createOptionalAuthMiddleware = (redis: Redis, publicKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);

      if (token) {
        // Only verify if token is provided
        const decoded = verifyToken(token, publicKey);

        // Check blacklist
        const isBlacklisted = await redis.exists(`blacklist:jti:${decoded.jti}`);
        if (isBlacklisted === 0) {
          // Only attach if not blacklisted
          (req as any).user = {
            ...decoded,
            token,
          };
          (req as any).tenantId = decoded.tenantId;
        }
      }

      next();
    } catch {
      // Silently fail - don't require auth for optional middleware
      next();
    }
  };
};

/**
 * Verify that user is authenticated
 * Throws error if user is not attached to request
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "AUTHENTICATION_ERROR",
        message: "Authentication required",
      },
    });
    return;
  }

  next();
};
