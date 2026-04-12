/**
 * JWT token generation and verification utilities
 * Uses RS256 (asymmetric) for security
 */

import jwt from "jsonwebtoken";
import { UserRole } from "@grocio/types";
import { AuthenticationError } from "./AppError";

export interface JWTPayload {
  sub: string; // user ID
  tenantId: string | null; // tenant ID (null for super_admin)
  role: UserRole;
  email: string;
  jti: string; // JWT ID for token family tracking
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sign an access token
 * @param payload - Token payload
 * @param privateKey - RSA private key
 * @param expiresIn - Token expiration time (default: 1 hour)
 * @returns Signed JWT access token
 */
export const signAccessToken = (
  payload: Omit<JWTPayload, "iat" | "exp" | "jti">,
  privateKey: string,
  expiresIn: string = "1h"
): string => {
  const jti = generateJTI();

  return jwt.sign(
    {
      ...payload,
      jti,
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn,
      issuer: "grocio-api",
      subject: payload.sub,
    }
  );
};

/**
 * Sign a refresh token
 * @param payload - Token payload
 * @param privateKey - RSA private key
 * @param expiresIn - Token expiration time (default: 7 days)
 * @returns Signed JWT refresh token
 */
export const signRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp" | "jti">,
  privateKey: string,
  expiresIn: string = "7d"
): string => {
  const jti = generateJTI();

  return jwt.sign(
    {
      ...payload,
      type: "refresh",
      jti,
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn,
      issuer: "grocio-api",
      subject: payload.sub,
    }
  );
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @param publicKey - RSA public key
 * @returns Decoded JWT payload
 * @throws AuthenticationError if token is invalid or expired
 */
export const verifyToken = (token: string, publicKey: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      issuer: "grocio-api",
    });

    return decoded as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError("Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError("Invalid token");
    }
    throw new AuthenticationError("Token verification failed");
  }
};

/**
 * Decode a token without verification (for inspection only)
 * @param token - JWT token
 * @returns Decoded payload or null if invalid
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token or null if invalid format
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
};

/**
 * Generate a unique JWT ID (jti claim)
 * Used for token family tracking and logout blacklist
 * @returns Unique JWT ID
 */
export const generateJTI = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Create a token pair (access + refresh)
 * @param userId - User ID
 * @param tenantId - Tenant ID (null for super_admin)
 * @param email - User email
 * @param role - User role
 * @param privateKey - RSA private key
 * @returns Token pair object
 */
export const createTokenPair = (
  userId: string,
  tenantId: string | null,
  email: string,
  role: UserRole,
  privateKey: string
): TokenPair => {
  const payload: Omit<JWTPayload, "iat" | "exp" | "jti"> = {
    sub: userId,
    tenantId,
    email,
    role,
  };

  return {
    accessToken: signAccessToken(payload, privateKey),
    refreshToken: signRefreshToken(payload, privateKey),
  };
};

/**
 * Refresh token pair (issue new pair, invalidate old one)
 * @param oldRefreshToken - Current refresh token
 * @param publicKey - RSA public key (for verification)
 * @param privateKey - RSA private key (for signing new tokens)
 * @returns New token pair
 * @throws AuthenticationError if refresh token is invalid
 */
export const refreshTokenPair = (
  oldRefreshToken: string,
  publicKey: string,
  privateKey: string
): TokenPair => {
  const decoded = verifyToken(oldRefreshToken, publicKey);

  return createTokenPair(decoded.sub, decoded.tenantId, decoded.email, decoded.role, privateKey);
};
