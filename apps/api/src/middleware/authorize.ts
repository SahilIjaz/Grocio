/**
 * Authorization middleware (RBAC)
 * Enforces role-based access control
 */

import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "@/utils";
import { UserRole } from "@grocio/types";

/**
 * Create role-based authorization middleware
 * @param allowedRoles - Array of roles that can access this endpoint
 * @returns Express middleware function
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    // Ensure user is authenticated
    if (!user) {
      throw new ForbiddenError("Authentication required");
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`This action requires one of the following roles: ${allowedRoles.join(", ")}`);
    }

    next();
  };
};

/**
 * Require super admin role
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  if (user.role !== "super_admin") {
    throw new ForbiddenError("Super admin access required");
  }

  next();
};

/**
 * Require store admin or super admin role
 */
export const requireStoreAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  if (user.role !== "store_admin" && user.role !== "super_admin") {
    throw new ForbiddenError("Store admin or super admin access required");
  }

  next();
};

/**
 * Require authenticated user (any role)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  next();
};

/**
 * Allow only customers
 */
export const requireCustomer = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  if (user.role !== "customer") {
    throw new ForbiddenError("Customer access only");
  }

  next();
};

/**
 * RBAC matrix for reference
 * Shows which roles can access which endpoints
 */
export const RBAC_MATRIX = {
  // Auth routes
  "POST /auth/register": ["public"],
  "POST /auth/login": ["public"],
  "POST /auth/refresh": ["public"],
  "POST /auth/logout": ["super_admin", "store_admin", "customer"],
  "GET /auth/me": ["super_admin", "store_admin", "customer"],

  // Tenant routes
  "GET /tenants": ["super_admin"],
  "POST /tenants": ["super_admin"],
  "GET /tenants/:id": ["super_admin"],
  "PATCH /tenants/:id": ["super_admin"],
  "DELETE /tenants/:id": ["super_admin"],

  // Product routes
  "GET /products": ["public"],
  "GET /products/:id": ["public"],
  "POST /products": ["store_admin"],
  "PATCH /products/:id": ["store_admin"],
  "DELETE /products/:id": ["store_admin"],

  // Cart routes
  "GET /cart": ["store_admin", "customer"],
  "POST /cart/items": ["store_admin", "customer"],
  "PATCH /cart/items/:id": ["store_admin", "customer"],
  "DELETE /cart/items/:id": ["store_admin", "customer"],

  // Order routes
  "GET /orders": ["store_admin", "customer"],
  "POST /orders": ["customer"],
  "PATCH /orders/:id/status": ["store_admin"],
} as const;
