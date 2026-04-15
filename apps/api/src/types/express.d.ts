/**
 * Express type augmentation
 * Extends Express Request to include custom properties
 */

import { JWTPayload } from "@/utils/jwt";

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user payload from JWT token
       * Populated by authenticate middleware
       */
      user?: JWTPayload & { token: string };

      /**
       * Tenant ID resolved from user's JWT or X-Tenant-ID header (super admin only)
       * Populated by resolveTenant middleware
       */
      tenantId?: string | null;

      /**
       * Unique request ID for tracing and logging
       * Populated by requestId middleware
       */
      id?: string;

      /**
       * Validated query parameters (from validateQuery middleware)
       */
      validatedQuery?: Record<string, unknown>;

      /**
       * Validated route parameters (from validateParams middleware)
       */
      validatedParams?: Record<string, unknown>;
    }
  }
}

export {};
