/**
 * Tenant HTTP controllers
 * Parse requests, validate, call service, send responses
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TenantService } from "./tenant.service";
import { createTenantWithConfirmSchema, updateTenantSchema, listTenantsQuerySchema, suspendTenantSchema } from "./tenant.schemas";
import { sendSuccess, sendCreated, sendPaginated } from "@/utils/response";
import { asyncHandler } from "@/utils/asyncHandler";

export class TenantController {
  private service: TenantService;

  constructor(private prisma: PrismaClient) {
    this.service = new TenantService(prisma);
  }

  /**
   * POST /api/v1/tenants
   * Register a new tenant with store admin user
   * Public endpoint (no auth required)
   */
  registerTenant = asyncHandler(async (req: Request, res: Response) => {
    const validated = createTenantWithConfirmSchema.parse(req.body);

    const { tenant, storeAdmin } = await this.service.registerTenant(validated, req.user?.sub);

    sendCreated(res, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        contactEmail: tenant.contactEmail,
        settings: tenant.settings,
      },
      storeAdmin: {
        id: storeAdmin.id,
        email: storeAdmin.email,
        firstName: storeAdmin.firstName,
        lastName: storeAdmin.lastName,
        role: storeAdmin.role,
      },
    });
  });

  /**
   * GET /api/v1/tenants/:id
   * Get tenant details
   * Auth required (store_admin can view own, super_admin can view any)
   */
  getTenant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const tenant = await this.service.getTenant(id, req.user?.sub, req.user?.role);

    sendSuccess(res, {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      logoUrl: tenant.logoUrl,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      address: tenant.address,
      settings: tenant.settings,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  });

  /**
   * PATCH /api/v1/tenants/:id
   * Update tenant profile
   * Auth required (store_admin can update own, super_admin can update any)
   */
  updateTenant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validated = updateTenantSchema.parse(req.body);

    const updated = await this.service.updateTenant(id, validated, req.user?.sub!, req.user?.role!, req.user?.sub);

    sendSuccess(res, {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      status: updated.status,
      logoUrl: updated.logoUrl,
      contactEmail: updated.contactEmail,
      contactPhone: updated.contactPhone,
      address: updated.address,
      settings: updated.settings,
      updatedAt: updated.updatedAt,
    });
  });

  /**
   * POST /api/v1/tenants/:id/suspend
   * Suspend tenant (super_admin only)
   */
  suspendTenant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validated = suspendTenantSchema.parse(req.body);

    const suspended = await this.service.suspendTenant(id, validated, req.user?.sub!);

    sendSuccess(res, {
      id: suspended.id,
      status: suspended.status,
      message: "Tenant suspended successfully",
    });
  });

  /**
   * POST /api/v1/tenants/:id/activate
   * Activate tenant (super_admin only)
   */
  activateTenant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const activated = await this.service.activateTenant(id, req.user?.sub!);

    sendSuccess(res, {
      id: activated.id,
      status: activated.status,
      message: "Tenant activated successfully",
    });
  });

  /**
   * GET /api/v1/tenants
   * List all tenants with pagination (super_admin only)
   */
  listTenants = asyncHandler(async (req: Request, res: Response) => {
    const validated = listTenantsQuerySchema.parse(req.query);

    const result = await this.service.listTenants({
      page: validated.page,
      limit: validated.limit,
      status: validated.status,
      search: validated.search,
    });

    sendPaginated(res, result.tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      contactEmail: t.contactEmail,
      createdAt: t.createdAt,
    })), {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  });

  /**
   * DELETE /api/v1/tenants/:id
   * Delete tenant and cascade (super_admin only)
   */
  deleteTenant = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.service.deleteTenant(id, req.user?.sub!);

    sendSuccess(res, {
      id,
      message: "Tenant deleted successfully",
    });
  });

  /**
   * GET /api/v1/tenants/:slug/check-slug
   * Check if slug is available (public)
   */
  checkSlugAvailable = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const available = await this.service.checkSlugAvailable(slug);

    sendSuccess(res, {
      slug,
      available,
    });
  });
}

/**
 * Factory function to create controller instance
 */
export function createTenantController(prisma: PrismaClient): TenantController {
  return new TenantController(prisma);
}
