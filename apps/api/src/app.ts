/**
 * Express application factory
 * Assembles all middleware and routes
 */

import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

// Utilities and middleware
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/response";
import {
  createAuthenticateMiddleware,
  resolveTenant,
  enforceTenantIsolation,
} from "@/middleware";
import { createErrorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { createGlobalRateLimiter, createLoginRateLimiter } from "@/middleware/rateLimiter";
import { validate } from "@/middleware/validate";

// Routes
import { createAuthRouter } from "@/modules/auth/auth.routes";
import { createTenantRouter } from "@/modules/tenants/tenant.routes";
import { createCategoryRouter } from "@/modules/categories/category.routes";
import { createProductRouter } from "@/modules/products/product.routes";
import { createCartRouter } from "@/modules/cart/cart.routes";
import { createOrderRouter } from "@/modules/orders/order.routes";
import { createDashboardRouter } from "@/modules/dashboards/dashboard.routes";

// Config
import { getConfig, getCORSOrigins, getJWTKeys } from "@/config";

/**
 * Create Express application
 * @param prisma - Prisma client instance
 * @param redis - Redis client instance
 * @returns Configured Express app
 */
export function createApp(prisma: PrismaClient, redis: Redis): Express {
  const app = express();
  const config = getConfig();
  const { privateKey: jwtPrivateKey, publicKey: jwtPublicKey } = getJWTKeys();

  // ===== SECURITY MIDDLEWARE =====

  // Helmet - Security headers
  app.use(helmet());

  // CORS - Cross-origin requests
  app.use(
    cors({
      origin: getCORSOrigins(),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
      exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    })
  );

  // ===== PARSING MIDDLEWARE =====

  // Body parser
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ limit: "10kb", extended: true }));

  // Cookie parser
  app.use(cookieParser());

  // ===== LOGGING MIDDLEWARE =====

  // Morgan HTTP request logging
  app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

  // ===== REQUEST ID MIDDLEWARE =====

  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    res.setHeader("X-Request-ID", (req as any).id);
    next();
  });

  // ===== RATE LIMITING MIDDLEWARE =====

  // Global rate limiter (all endpoints)
  app.use(createGlobalRateLimiter(redis, 60 * 1000, 200));

  // ===== AUTHENTICATION MIDDLEWARE =====

  // JWT authentication (validates tokens, checks blacklist)
  app.use(createAuthenticateMiddleware(redis, jwtPublicKey));

  // ===== TENANT RESOLUTION MIDDLEWARE =====

  // Resolve tenant context from user or headers
  app.use(resolveTenant);

  // Enforce tenant isolation for non-super-admin users
  app.use(enforceTenantIsolation);

  // ===== HEALTH CHECK ENDPOINTS =====

  // Liveness probe - is the application running?
  app.get("/health", asyncHandler(async (req: Request, res: Response) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: "connecting...",
        redis: "connecting...",
      },
    };

    try {
      // Check database connectivity
      await (prisma as any).$queryRaw`SELECT 1`;
      health.checks.database = "connected";
    } catch (error) {
      health.checks.database = "disconnected";
      health.status = "unhealthy";
    }

    try {
      // Check Redis connectivity
      await redis.ping();
      health.checks.redis = "connected";
    } catch (error) {
      health.checks.redis = "disconnected";
      health.status = "unhealthy";
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  }));

  // Readiness probe - is the application ready to accept traffic?
  app.get("/ready", asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check database is accessible
      await (prisma as any).$queryRaw`SELECT 1`;

      // Check Redis is accessible
      await redis.ping();

      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }));

  // ===== API ROUTES =====

  const apiRouter = express.Router();

  // Auth routes (public register, protected endpoints)
  apiRouter.use("/auth", createAuthRouter(prisma, redis, jwtPrivateKey, jwtPublicKey));

  // Tenant routes (public register, protected CRUD)
  apiRouter.use("/tenants", createTenantRouter(prisma));

  // Category routes (public list/get, protected CRUD)
  apiRouter.use("/categories", createCategoryRouter(prisma));

  // Product routes (public list/get, protected CRUD)
  apiRouter.use("/products", createProductRouter(prisma));

  // Cart routes (authenticated users only)
  apiRouter.use("/cart", createCartRouter(prisma, redis));

  // Order routes (authenticated users only)
  apiRouter.use("/orders", createOrderRouter(prisma));

  // Dashboard & analytics routes (authenticated admins)
  apiRouter.use("/dashboards", createDashboardRouter(prisma));
  apiRouter.use("/audit-logs", createDashboardRouter(prisma));
  apiRouter.use("/alerts", createDashboardRouter(prisma));

  // Mount all API routes under /api/v1
  app.use(config.API_PREFIX, apiRouter);

  // ===== 404 HANDLER =====

  app.use(notFoundHandler);

  // ===== ERROR HANDLING MIDDLEWARE =====

  // Global error handler (MUST be last)
  app.use(createErrorHandler(config.NODE_ENV === "development"));

  return app;
}

export default createApp;
