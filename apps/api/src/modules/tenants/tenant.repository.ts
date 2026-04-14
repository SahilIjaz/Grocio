/**
 * Tenant data access layer
 * All Prisma queries for tenant operations
 * Always receives tenantId as explicit argument for isolation
 */

import { PrismaClient, Tenant, User } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../utils/AppError";
import { auditLog } from "../../services/audit.service";

export class TenantRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new tenant with atomic store_admin user creation
   * Single transaction ensures both succeed or both fail
   */
  async createTenant(
    data: {
      name: string;
      slug: string;
      contactEmail: string;
      contactPhone?: string;
      address?: string;
      ownerFirstName: string;
      ownerLastName: string;
      ownerEmail: string;
      ownerPasswordHash: string;
      settings?: Record<string, any>;
    },
    actorId?: string
  ): Promise<Tenant & { storeAdmin: User }> {
    // Check slug uniqueness first
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ConflictError("Tenant slug already exists");
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: data.name,
            slug: data.slug,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone || null,
            address: data.address || null,
            status: "active",
            settings: data.settings || {
              currency: "USD",
              timezone: "America/Los_Angeles",
              taxRate: 0.0,
              deliveryFee: 0,
              orderPrefix: "ORD",
            },
          },
        });

        // 2. Create store_admin user
        const storeAdmin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: data.ownerEmail,
            firstName: data.ownerFirstName,
            lastName: data.ownerLastName,
            passwordHash: data.ownerPasswordHash,
            role: "store_admin",
            isActive: true,
          },
        });

        // 3. Audit log
        if (actorId) {
          await auditLog(tx, {
            tenantId: tenant.id,
            actorId,
            action: "CREATE",
            entityType: "tenant",
            entityId: tenant.id,
            newValues: {
              name: tenant.name,
              slug: tenant.slug,
              status: tenant.status,
            },
          });
        }

        return { tenant, storeAdmin };
      });

      return {
        ...result.tenant,
        storeAdmin: result.storeAdmin,
      };
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      throw error;
    }
  }

  /**
   * Find tenant by ID
   */
  async findTenantById(tenantId: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  /**
   * Find tenant by slug (used during login to verify domain-slug routing)
   */
  async findTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  /**
   * Update tenant profile (store admin can update own, super_admin can update any)
   */
  async updateTenant(
    tenantId: string,
    data: {
      name?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      logoUrl?: string;
      settings?: Record<string, any>;
    },
    actorId?: string
  ): Promise<Tenant> {
    const tenant = await this.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name ?? tenant.name,
        contactEmail: data.contactEmail ?? tenant.contactEmail,
        contactPhone: data.contactPhone ?? tenant.contactPhone,
        address: data.address ?? tenant.address,
        logoUrl: data.logoUrl ?? tenant.logoUrl,
        settings: data.settings
          ? { ...tenant.settings, ...data.settings }
          : tenant.settings,
        updatedAt: new Date(),
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "UPDATE",
        entityType: "tenant",
        entityId: tenantId,
        oldValues: {
          name: tenant.name,
          contactEmail: tenant.contactEmail,
          settings: tenant.settings,
        },
        newValues: {
          name: updated.name,
          contactEmail: updated.contactEmail,
          settings: updated.settings,
        },
      });
    }

    return updated;
  }

  /**
   * Suspend tenant (super_admin only)
   */
  async suspendTenant(
    tenantId: string,
    reason?: string,
    actorId?: string
  ): Promise<Tenant> {
    const tenant = await this.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "suspended",
        settings: {
          ...tenant.settings,
          suspendedReason: reason,
          suspendedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "SUSPEND",
        entityType: "tenant",
        entityId: tenantId,
        newValues: { status: "suspended", reason },
      });
    }

    return updated;
  }

  /**
   * Activate tenant (super_admin only)
   */
  async activateTenant(tenantId: string, actorId?: string): Promise<Tenant> {
    const tenant = await this.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "active",
        settings: {
          ...tenant.settings,
          suspendedReason: undefined,
          suspendedAt: undefined,
        },
        updatedAt: new Date(),
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "ACTIVATE",
        entityType: "tenant",
        entityId: tenantId,
        newValues: { status: "active" },
      });
    }

    return updated;
  }

  /**
   * List all tenants with pagination and filters (super_admin only)
   */
  async listTenants(options: {
    page: number;
    limit: number;
    status?: "active" | "suspended" | "pending";
    search?: string;
  }): Promise<{ tenants: Tenant[]; total: number; page: number; limit: number }> {
    const { page, limit, status, search } = options;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
          { contactEmail: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      tenants,
      total,
      page,
      limit,
    };
  }

  /**
   * Delete tenant and cascade all related data (super_admin only)
   * Prisma schema has ON DELETE CASCADE, so this is safe
   */
  async deleteTenant(tenantId: string, actorId?: string): Promise<Tenant> {
    const tenant = await this.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    const deleted = await this.prisma.tenant.delete({
      where: { id: tenantId },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "DELETE",
        entityType: "tenant",
        entityId: tenantId,
        oldValues: {
          name: deleted.name,
          slug: deleted.slug,
          status: deleted.status,
        },
      });
    }

    return deleted;
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    return !existing;
  }

  /**
   * Get tenant with store admin user
   */
  async getTenantWithAdmin(tenantId: string): Promise<
    | (Tenant & {
        storeAdmin: User | null;
      })
    | null
  > {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { role: "store_admin" },
          take: 1,
        },
      },
      // Transform users array into single storeAdmin object
    }).then((t) => {
      if (!t) return null;
      return {
        ...t,
        storeAdmin: t.users?.[0] || null,
      };
    });
  }
}

/**
 * Factory function to create repository instance
 */
export function createTenantRepository(prisma: PrismaClient): TenantRepository {
  return new TenantRepository(prisma);
}
