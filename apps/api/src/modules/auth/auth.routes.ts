/**
 * Authentication routes
 * All public auth endpoints (register, login, refresh, logout, forgot/reset password)
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { validate } from "@/middleware/validate";
import {
  registerWithConfirmSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordWithConfirmSchema,
} from "./auth.schemas";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

/**
 * Create auth router
 * @param prisma - Prisma client instance
 * @param redis - Redis client instance
 * @param jwtPrivateKey - JWT private key (RS256)
 * @param jwtPublicKey - JWT public key (RS256)
 * @returns Express router with auth routes
 */
export function createAuthRouter(
  prisma: PrismaClient,
  redis: Redis,
  jwtPrivateKey: string,
  jwtPublicKey: string
): Router {
  const router = Router();
  const authService = new AuthService(prisma, redis, jwtPrivateKey, jwtPublicKey);
  const authController = new AuthController(authService);

  /**
   * POST /api/v1/auth/register
   * Register a new user account
   *
   * Body:
   * {
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "email": "john@example.com",
   *   "password": "SecurePass123!",
   *   "confirmPassword": "SecurePass123!",
   *   "tenantName": "John's Grocery" (optional, creates new store)
   * }
   */
  router.post("/register", validate(registerWithConfirmSchema), authController.registerUser);

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return JWT tokens
   *
   * Body:
   * {
   *   "email": "john@example.com",
   *   "password": "SecurePass123!"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "user": { "id", "email", "firstName", "lastName", "role", "tenantId", ... },
   *     "accessToken": "eyJhbGc..."
   *   },
   *   "error": null
   * }
   *
   * Cookies:
   * - refreshToken (httpOnly, secure)
   */
  router.post("/login", validate(loginSchema), authController.login);

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   *
   * Body (optional, can use cookie):
   * {
   *   "refreshToken": "eyJhbGc..."
   * }
   *
   * Cookies:
   * - refreshToken (httpOnly)
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "accessToken": "eyJhbGc..."
   *   },
   *   "error": null
   * }
   */
  router.post("/refresh", validate(refreshTokenSchema), authController.refreshToken);

  /**
   * POST /api/v1/auth/logout
   * Logout user by blacklisting tokens
   *
   * Headers:
   * - Authorization: Bearer <accessToken>
   *
   * Cookies:
   * - refreshToken (httpOnly)
   *
   * Response:
   * {
   *   "success": true,
   *   "data": { "message": "Logged out successfully" },
   *   "error": null
   * }
   */
  router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
    // This route requires authentication, middleware will be applied globally
    authController.logout(req, res, next);
  });

  /**
   * POST /api/v1/auth/forgot-password
   * Initiate password reset flow
   * Sends reset link to email (in production)
   *
   * Body:
   * {
   *   "email": "john@example.com"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "message": "If an account exists...",
   *     "resetToken": "..." (dev only)
   *   },
   *   "error": null
   * }
   */
  router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);

  /**
   * POST /api/v1/auth/reset-password
   * Complete password reset
   *
   * Body:
   * {
   *   "token": "reset-token-from-email",
   *   "password": "NewSecurePass123!",
   *   "confirmPassword": "NewSecurePass123!"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": { "message": "Password reset successfully" },
   *   "error": null
   * }
   */
  router.post("/reset-password", validate(resetPasswordWithConfirmSchema), authController.resetPassword);

  /**
   * GET /api/v1/auth/me
   * Get current user profile
   * Requires: Valid JWT in Authorization header
   *
   * Headers:
   * - Authorization: Bearer <accessToken>
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "user": { "id", "email", "firstName", "lastName", "role", "tenantId", ... }
   *   },
   *   "error": null
   * }
   */
  router.get("/me", (req: Request, res: Response, next: NextFunction) => {
    // This route requires authentication, middleware will be applied globally
    authController.getCurrentUser(req, res, next);
  });

  return router;
}

export default createAuthRouter;
