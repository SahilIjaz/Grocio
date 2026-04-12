/**
 * Authentication service
 * Business logic for auth operations (registration, login, token management)
 * Orchestrates between repository and Redis services
 */

import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import {
  createTokenPair,
  refreshTokenPair,
  verifyToken,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  TokenPair,
} from "@/utils";
import { AuthRepository } from "./auth.repository";
import { User, UserRole } from "@grocio/types";

export class AuthService {
  private repository: AuthRepository;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private jwtPrivateKey: string,
    private jwtPublicKey: string
  ) {
    this.repository = new AuthRepository(prisma);
  }

  /**
   * Register a new user
   * Creates user with hashed password and logs audit event
   */
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    tenantId?: string; // optional for tenant registration
    role?: UserRole;
  }): Promise<{ user: Omit<User, "passwordHash">; tokens: TokenPair }> {
    // Validate password strength
    validatePasswordStrength(data.password);

    // Check if email is already in use
    const existingUser = await this.repository.findByEmail(data.email, data.tenantId);
    if (existingUser) {
      throw new ConflictError("Email is already in use");
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.repository.createUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: data.role || "customer",
      tenantId: data.tenantId,
    });

    // Log audit event
    await this.repository.logAuditEvent({
      tenantId: data.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      action: "CREATE",
      entityType: "user",
      entityId: user.id,
    });

    // Create token pair
    const tokens = createTokenPair(user.id, user.tenantId, user.email, user.role as UserRole, this.jwtPrivateKey);

    // Return safe user (no password hash)
    const safeUser = this.repository.getSafeUserResponse(user);

    return { user: safeUser, tokens };
  }

  /**
   * Authenticate user and return tokens
   * Validates credentials and creates new token pair
   */
  async login(data: { email: string; password: string; ipAddress?: string }): Promise<{
    user: Omit<User, "passwordHash">;
    tokens: TokenPair;
  }> {
    // Find user by email
    const user = await this.repository.findByEmail(data.email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError("User account is disabled");
    }

    // Update last login timestamp
    await this.repository.updateLastLogin(user.id);

    // Log audit event
    await this.repository.logAuditEvent({
      tenantId: user.tenantId,
      actorId: user.id,
      actorEmail: user.email,
      action: "LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: data.ipAddress,
    });

    // Create token pair
    const tokens = createTokenPair(user.id, user.tenantId, user.email, user.role as UserRole, this.jwtPrivateKey);

    // Return safe user
    const safeUser = this.repository.getSafeUserResponse(user);

    return { user: safeUser, tokens };
  }

  /**
   * Refresh access token
   * Validates refresh token and issues new token pair
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, this.jwtPublicKey);

    // Check refresh token family in Redis
    const storedJti = await this.redis.get(`refresh_family:${decoded.sub}`);
    if (storedJti !== decoded.jti) {
      // Token family mismatch - possible token theft
      // Invalidate all tokens for this user
      await this.invalidateUserTokens(decoded.sub);
      throw new AuthenticationError("Refresh token is invalid or has been revoked");
    }

    // Get user to ensure they still exist and are active
    const user = await this.repository.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new AuthenticationError("User not found or is disabled");
    }

    // Generate new token pair
    const newTokens = createTokenPair(
      user.id,
      user.tenantId,
      user.email,
      user.role as UserRole,
      this.jwtPrivateKey
    );

    // Update refresh token family with new JTI
    const newDecoded = verifyToken(newTokens.refreshToken, this.jwtPublicKey);
    await this.redis.setex(`refresh_family:${user.id}`, 7 * 24 * 60 * 60, newDecoded.jti);

    return newTokens;
  }

  /**
   * Logout user
   * Blacklists both access and refresh tokens
   */
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Decode both tokens to get JTI and remaining lifetime
      const accessDecoded = verifyToken(accessToken, this.jwtPublicKey);
      const refreshDecoded = verifyToken(refreshToken, this.jwtPublicKey);

      // Calculate remaining TTL (in seconds)
      const now = Math.floor(Date.now() / 1000);
      const accessTTL = Math.max(0, accessDecoded.exp - now);
      const refreshTTL = Math.max(0, refreshDecoded.exp - now);

      // Add both to blacklist
      if (accessTTL > 0) {
        await this.redis.setex(`blacklist:jti:${accessDecoded.jti}`, accessTTL, "1");
      }
      if (refreshTTL > 0) {
        await this.redis.setex(`blacklist:jti:${refreshDecoded.jti}`, refreshTTL, "1");
      }

      // Delete refresh token family
      await this.redis.del(`refresh_family:${accessDecoded.sub}`);

      // Log audit event
      const user = await this.repository.findById(accessDecoded.sub);
      if (user) {
        await this.repository.logAuditEvent({
          tenantId: user.tenantId,
          actorId: user.id,
          actorEmail: user.email,
          action: "LOGOUT",
          entityType: "user",
          entityId: user.id,
        });
      }
    } catch {
      // If token verification fails, just continue with logout
      // This handles expired tokens gracefully
    }
  }

  /**
   * Initiate password reset
   * Generates a reset token and stores it in database
   */
  async forgotPassword(email: string): Promise<{ resetToken: string }> {
    // Find user
    const user = await this.repository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists (security best practice)
      return { resetToken: "email_sent" };
    }

    // Generate reset token (32 random bytes, base64 encoded)
    const resetToken = this.generateResetToken();
    const tokenHash = this.hashResetToken(resetToken);

    // Store token in database with 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.repository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // In production, send email with reset link containing resetToken
    // For now, just return the token (in dev only)
    return { resetToken };
  }

  /**
   * Complete password reset
   * Validates reset token and updates password
   */
  async resetPassword(data: { token: string; password: string }): Promise<void> {
    // Validate new password strength
    validatePasswordStrength(data.password);

    // Hash the provided token to match database
    const tokenHash = this.hashResetToken(data.token);

    // Find password reset token
    const resetToken = await this.repository.findValidPasswordResetToken("any", tokenHash);
    if (!resetToken) {
      throw new AuthenticationError("Invalid or expired reset token");
    }

    // Hash new password
    const passwordHash = await hashPassword(data.password);

    // Update user password
    await this.repository.updatePassword(resetToken.userId, passwordHash);

    // Mark token as used
    await this.repository.markPasswordResetTokenAsUsed(tokenHash);

    // Invalidate all user tokens
    await this.invalidateUserTokens(resetToken.userId);

    // Log audit event
    const user = await this.repository.findById(resetToken.userId);
    if (user) {
      await this.repository.logAuditEvent({
        tenantId: user.tenantId,
        actorId: user.id,
        actorEmail: user.email,
        action: "UPDATE",
        entityType: "user",
        entityId: user.id,
      });
    }
  }

  /**
   * Check if a JWT token is blacklisted (revoked)
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const isBlacklisted = await this.redis.exists(`blacklist:jti:${jti}`);
    return isBlacklisted === 1;
  }

  /**
   * Invalidate all tokens for a user (used after password reset)
   */
  private async invalidateUserTokens(userId: string): Promise<void> {
    await this.redis.del(`refresh_family:${userId}`);
  }

  /**
   * Generate a random reset token
   */
  private generateResetToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Hash a reset token (SHA-256 style, simplified for this example)
   * In production, use crypto.createHash
   */
  private hashResetToken(token: string): string {
    return Buffer.from(token).toString("base64");
  }
}
