/**
 * Rate limiting middleware using Redis
 * Protects against brute force and DoS attacks
 */

import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { RateLimitError } from "@/utils";

/**
 * Create global rate limiter (per IP)
 * @param redis - Redis client
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @param maxRequests - Max requests per window (default: 200)
 */
export const createGlobalRateLimiter = (
  redis: Redis,
  windowMs: number = 60 * 1000,
  maxRequests: number = 200
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || "unknown";
      const key = `rate-limit:global:${ip}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      // Increment counter
      const count = await redis.incr(key);

      // Set TTL on first request in window
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count).toString());
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(Date.now() + windowSeconds * 1000).toISOString()
      );

      // Check if limit exceeded
      if (count > maxRequests) {
        throw new RateLimitError("Too many requests, please try again later");
      }

      next();
    } catch (error) {
      // Don't block requests if Redis is down (fail open)
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("Rate limiter error:", error);
      next();
    }
  };
};

/**
 * Create login-specific rate limiter
 * Stricter limits on login endpoint to prevent brute force
 * @param redis - Redis client
 */
export const createLoginRateLimiter = (redis: Redis) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || "unknown";
      const email = (req.body?.email || "unknown").toLowerCase();
      const key = `rate-limit:login:${ip}:${email}`;

      // 10 attempts per 15 minutes
      const maxAttempts = 10;
      const windowSeconds = 15 * 60;

      const attempts = await redis.incr(key);

      if (attempts === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Set headers
      res.setHeader("X-Login-Attempts", attempts.toString());
      res.setHeader("X-Login-Remaining", Math.max(0, maxAttempts - attempts).toString());

      if (attempts > maxAttempts) {
        throw new RateLimitError(
          `Too many login attempts. Please try again in ${Math.ceil(
            windowSeconds / 60
          )} minutes`
        );
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("Login rate limiter error:", error);
      next();
    }
  };
};

/**
 * Create per-tenant rate limiter
 * Prevents one tenant from overwhelming the system
 * @param redis - Redis client
 */
export const createTenantRateLimiter = (
  redis: Redis,
  windowMs: number = 60 * 1000,
  maxRequests: number = 1000
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;

      // Only apply to authenticated requests with tenant context
      if (!tenantId) {
        return next();
      }

      const key = `rate-limit:tenant:${tenantId}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Set headers
      res.setHeader("X-Tenant-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-Tenant-RateLimit-Remaining", Math.max(0, maxRequests - count).toString());

      if (count > maxRequests) {
        throw new RateLimitError(
          "Tenant request limit exceeded. Please try again in a few moments"
        );
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("Tenant rate limiter error:", error);
      next();
    }
  };
};

/**
 * Create user-specific rate limiter
 * Prevents individual users from spamming endpoints
 * @param redis - Redis client
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Max requests per window
 */
export const createUserRateLimiter = (
  redis: Redis,
  windowMs: number = 60 * 1000,
  maxRequests: number = 500
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.sub;

      // Only apply to authenticated users
      if (!userId) {
        return next();
      }

      const key = `rate-limit:user:${userId}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Set headers
      res.setHeader("X-User-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-User-RateLimit-Remaining", Math.max(0, maxRequests - count).toString());

      if (count > maxRequests) {
        throw new RateLimitError("You are sending too many requests. Please slow down");
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("User rate limiter error:", error);
      next();
    }
  };
};
