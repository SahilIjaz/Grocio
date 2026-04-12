/**
 * Authentication repository
 * All Prisma database queries for auth operations
 * This layer ensures type-safe database access
 */

import { PrismaClient, User } from "@prisma/client";
import { NotFoundError } from "@/utils";

export class AuthRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find user by email (globally unique for super_admin, unique per tenant otherwise)
   */
  async findByEmail(email: string, tenantId?: string | null): Promise<User | null> {
    // If tenantId is provided, find within tenant scope
    if (tenantId) {
      return this.prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email,
          },
        },
      });
    }

    // Otherwise, find super_admin user (tenant_id is null)
    return this.prisma.user.findFirst({
      where: {
        email,
        tenantId: null,
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Find user by ID within a specific tenant
   */
  async findByIdInTenant(userId: string, tenantId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: "super_admin" | "store_admin" | "customer";
    tenantId?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        tenantId: data.tenantId || null,
      },
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
      },
    });
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find a valid password reset token
   */
  async findValidPasswordResetToken(
    userId: string,
    tokenHash: string
  ): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  } | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    // Check if token exists, belongs to user, hasn't expired, and hasn't been used
    if (token && token.userId === userId && token.expiresAt > new Date() && !token.usedAt) {
      return token;
    }

    return null;
  }

  /**
   * Mark a password reset token as used
   */
  async markPasswordResetTokenAsUsed(tokenHash: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { tokenHash },
      data: {
        usedAt: new Date(),
      },
    });
  }

  /**
   * Delete expired password reset tokens (cleanup)
   */
  async deleteExpiredPasswordResetTokens(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Log audit event
   */
  async logAuditEvent(data: {
    tenantId?: string;
    actorId: string;
    actorEmail: string;
    action: "LOGIN" | "LOGOUT" | "CREATE";
    entityType: string;
    entityId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        actorId: data.actorId,
        actorEmail: data.actorEmail,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Check if email is already in use in a tenant
   */
  async isEmailInUse(email: string, tenantId?: string | null): Promise<boolean> {
    const user = await this.findByEmail(email, tenantId);
    return !!user;
  }

  /**
   * Get user without password (safe for response)
   */
  getSafeUserResponse(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
