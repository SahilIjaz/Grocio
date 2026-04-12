/**
 * Tenant business logic layer
 * Orchestrates repository, handles validation, enforces business rules
 */

import { PrismaClient, Tenant, User } from "@prisma/client";
import { CreateTenantRequest, UpdateTenantRequest, SuspendTenantRequest } from "./tenant.schemas";
import { TenantRepository } from "./tenant.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/utils/AppError";
import { hashPassword, validatePasswordStrength } from "@/utils/password";

export class TenantService {
  private repository: TenantRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new TenantRepository(prisma);
  }

  /**
   * Register a new tenant with store admin user
   * 1. Validate input
   * 2. Hash password
   * 3. Check email uniqueness across all tenants (users table)
   * 4. Check slug uniqueness
   * 5. Atomic: create tenant + store_admin user
   */
  async registerTenant(
    input: CreateTenantRequest,
    actorId?: string
  ): Promise<{ tenant: Tenant; storeAdmin: User }> {
    // Validate password strength
    const passwordStrengthError = validatePasswordStrength(input.ownerPassword);
    if (passwordStrengthError) {
      throw new ValidationError(passwordStrengthError);
    }

    // Check if store owner email is already registered (across any tenant)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: input.ownerEmail },
    });
    if (existingUser) {
      throw new ConflictError("Owner email is already registered");
    }

    // Check slug availability
    const isAvailable = await this.repository.isSlugAvailable(input.slug);
    if (!isAvailable) {
      throw new ConflictError("Store slug is already taken");
    }

    // Hash password
    const passwordHash = await hashPassword(input.ownerPassword);

    // Atomic tenant + admin creation
    const result = await this.repository.createTenant(
      {
        name: input.name,
        slug: input.slug,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        address: input.address,
        ownerFirstName: input.ownerFirstName,
        ownerLastName: input.ownerLastName,
        ownerEmail: input.ownerEmail,
        ownerPasswordHash: passwordHash,
        settings: input.settings,
      },
      actorId
    );

    return {
      tenant: result,
      storeAdmin: result.storeAdmin,
    };
  }

  /**
   * Get tenant details
   * Super admin can view any tenant
   * Store admin can view only their own tenant
   */
  async getTenant(tenantId: string, requesterId?: string, requesterRole?: string): Promise<Tenant> {
    // Tenant isolation: store_admin can only view their own tenant
    if (requesterRole === "store_admin" && requesterId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });
      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot view other tenant details");
      }
    }

    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    return tenant;
  }

  /**
   * Update tenant profile
   * Super admin can update any tenant
   * Store admin can only update their own tenant
   */
  async updateTenant(
    tenantId: string,
    input: UpdateTenantRequest,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Tenant> {
    // Tenant isolation
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });
      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot update other tenant details");
      }
    }

    // Verify tenant exists
    await this.getTenant(tenantId, requesterId, requesterRole);

    return this.repository.updateTenant(tenantId, input, actorId || requesterId);
  }

  /**
   * Suspend tenant (super_admin only)
   * Prevents customers from placing orders but keeps data intact
   */
  async suspendTenant(
    tenantId: string,
    input: SuspendTenantRequest,
    actorId: string
  ): Promise<Tenant> {
    // Verify tenant exists
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    if (tenant.status === "suspended") {
      throw new ValidationError("Tenant is already suspended");
    }

    return this.repository.suspendTenant(tenantId, input.reason, actorId);
  }

  /**
   * Activate tenant (super_admin only)
   */
  async activateTenant(tenantId: string, actorId: string): Promise<Tenant> {
    // Verify tenant exists
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    if (tenant.status === "active") {
      throw new ValidationError("Tenant is already active");
    }

    return this.repository.activateTenant(tenantId, actorId);
  }

  /**
   * List all tenants with pagination (super_admin only)
   */
  async listTenants(options: {
    page: number;
    limit: number;
    status?: "active" | "suspended" | "pending";
    search?: string;
  }): Promise<{
    tenants: Tenant[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repository.listTenants(options);
  }

  /**
   * Delete tenant (super_admin only)
   * Cascades delete to all related users, products, orders, etc.
   */
  async deleteTenant(tenantId: string, actorId: string): Promise<Tenant> {
    // Verify tenant exists
    const tenant = await this.repository.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }

    return this.repository.deleteTenant(tenantId, actorId);
  }

  /**
   * Get tenant with store admin user (for registration response)
   */
  async getTenantWithAdmin(tenantId: string): Promise<(Tenant & { storeAdmin: User | null }) | null> {
    return this.repository.getTenantWithAdmin(tenantId);
  }

  /**
   * Verify tenant is active (used in middleware/services)
   */
  async verifyTenantActive(tenantId: string): Promise<boolean> {
    const tenant = await this.repository.findTenantById(tenantId);
    return tenant?.status === "active" ?? false;
  }

  /**
   * Check if slug is available
   */
  async checkSlugAvailable(slug: string): Promise<boolean> {
    return this.repository.isSlugAvailable(slug);
  }
}

/**
 * Factory function to create service instance
 */
export function createTenantService(prisma: PrismaClient): TenantService {
  return new TenantService(prisma);
}
