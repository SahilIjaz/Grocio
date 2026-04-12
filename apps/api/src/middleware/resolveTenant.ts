/**
 * Tenant resolution middleware
 * Extracts tenantId from JWT and validates super_admin override
 * Ensures all requests are scoped to correct tenant
 */

import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "@/utils";

/**
 * Resolve tenant context from authenticated user
 * Super admin can override with X-Tenant-ID header for cross-tenant operations
 */
export const resolveTenant = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  // Skip if not authenticated (public routes)
  if (!user) {
    return next();
  }

  let tenantId = user.tenantId;

  // Super admin can override tenant using X-Tenant-ID header
  if (user.role === "super_admin") {
    const headerTenantId = req.headers["x-tenant-id"] as string | undefined;

    if (headerTenantId) {
      // Validate UUID format
      if (!isValidUUID(headerTenantId)) {
        throw new ForbiddenError("Invalid tenant ID format");
      }
      tenantId = headerTenantId;
    }
    // If no header, tenantId remains null (cross-tenant view)
  }

  // Attach resolved tenantId to request
  (req as any).tenantId = tenantId;

  next();
};

/**
 * Verify that request is scoped to a valid tenant
 * Ensures regular users (store_admin, customer) always have a tenantId
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  const tenantId = (req as any).tenantId;

  // Super admin doesn't need a tenant (can be null)
  if (user?.role === "super_admin") {
    return next();
  }

  // All other users must have a tenant
  if (!tenantId) {
    throw new ForbiddenError("Tenant context is required");
  }

  next();
};

/**
 * Enforce tenant isolation for regular users
 * Prevent store_admin or customer from accessing other tenants
 */
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  const tenantId = (req as any).tenantId;

  // Super admin is not subject to isolation (they can access any tenant)
  if (user?.role === "super_admin") {
    return next();
  }

  // Regular users (store_admin, customer) must match their assigned tenant
  if (user?.tenantId && tenantId && user.tenantId !== tenantId) {
    throw new ForbiddenError("You do not have access to this tenant");
  }

  next();
};

/**
 * Validate UUID v4 format
 */
function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
