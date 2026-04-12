/**
 * Tenant routes
 * Tenant registration, CRUD, suspend/activate endpoints
 * Authorization handled via middleware
 */

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { TenantController } from "./tenant.controller";
import { authorize, requireSuperAdmin } from "@/middleware/authorize";
import { validate, validateQuery } from "@/middleware/validate";
import { createTenantWithConfirmSchema, updateTenantSchema, listTenantsQuerySchema, suspendTenantSchema } from "./tenant.schemas";

export function createTenantRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new TenantController(prisma);

  /**
   * POST /api/v1/tenants
   * Register a new tenant with store admin user
   * Public endpoint
   *
   * Body:
   * {
   *   "name": "Demo Grocery Store",
   *   "slug": "demo-grocery",
   *   "contactEmail": "contact@store.com",
   *   "contactPhone": "+1-234-567-8900",
   *   "address": "123 Main St",
   *   "ownerFirstName": "John",
   *   "ownerLastName": "Doe",
   *   "ownerEmail": "owner@store.com",
   *   "ownerPassword": "SecurePass123!",
   *   "ownerPasswordConfirm": "SecurePass123!",
   *   "settings": {
   *     "currency": "USD",
   *     "timezone": "America/Los_Angeles"
   *   }
   * }
   *
   * Response: 201
   * {
   *   "success": true,
   *   "data": {
   *     "tenant": { id, name, slug, status, contactEmail, settings },
   *     "storeAdmin": { id, email, firstName, lastName, role }
   *   }
   * }
   */
  router.post("/", validate(createTenantWithConfirmSchema), controller.registerTenant);

  /**
   * GET /api/v1/tenants
   * List all tenants with pagination and filters
   * Super admin only
   *
   * Query:
   * ?page=1&limit=20&status=active&search=grocery
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": [
   *     { id, name, slug, status, contactEmail, createdAt }
   *   ],
   *   "meta": {
   *     "page": 1,
   *     "limit": 20,
   *     "total": 42
   *   }
   * }
   */
  router.get("/", requireSuperAdmin, validateQuery(listTenantsQuerySchema), controller.listTenants);

  /**
   * GET /api/v1/tenants/:slug/check-slug
   * Check if tenant slug is available
   * Public endpoint
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": {
   *     "slug": "demo-grocery",
   *     "available": true
   *   }
   * }
   */
  router.get("/:slug/check-slug", controller.checkSlugAvailable);

  /**
   * GET /api/v1/tenants/:id
   * Get tenant details
   * Auth required (store_admin views own, super_admin views any)
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "name": "Demo Grocery Store",
   *     "slug": "demo-grocery",
   *     "status": "active",
   *     "logoUrl": "https://...",
   *     "contactEmail": "contact@store.com",
   *     "contactPhone": "+1-234-567-8900",
   *     "address": "123 Main St",
   *     "settings": { ... },
   *     "createdAt": "2026-04-12T...",
   *     "updatedAt": "2026-04-12T..."
   *   }
   * }
   */
  router.get(
    "/:id",
    authorize("store_admin", "super_admin"),
    controller.getTenant
  );

  /**
   * PATCH /api/v1/tenants/:id
   * Update tenant profile
   * Auth required (store_admin updates own, super_admin updates any)
   *
   * Body (all optional):
   * {
   *   "name": "Updated Store Name",
   *   "contactEmail": "new@store.com",
   *   "settings": { "currency": "EUR" }
   * }
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": { updated tenant object }
   * }
   */
  router.patch(
    "/:id",
    authorize("store_admin", "super_admin"),
    validate(updateTenantSchema),
    controller.updateTenant
  );

  /**
   * POST /api/v1/tenants/:id/suspend
   * Suspend tenant (super_admin only)
   *
   * Body (optional):
   * {
   *   "reason": "Payment not received"
   * }
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "status": "suspended",
   *     "message": "Tenant suspended successfully"
   *   }
   * }
   */
  router.post(
    "/:id/suspend",
    requireSuperAdmin,
    validate(suspendTenantSchema),
    controller.suspendTenant
  );

  /**
   * POST /api/v1/tenants/:id/activate
   * Activate suspended tenant (super_admin only)
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "status": "active",
   *     "message": "Tenant activated successfully"
   *   }
   * }
   */
  router.post("/:id/activate", requireSuperAdmin, controller.activateTenant);

  /**
   * DELETE /api/v1/tenants/:id
   * Delete tenant and cascade all related data (super_admin only)
   *
   * Response: 200
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "message": "Tenant deleted successfully"
   *   }
   * }
   */
  router.delete("/:id", requireSuperAdmin, controller.deleteTenant);

  return router;
}
