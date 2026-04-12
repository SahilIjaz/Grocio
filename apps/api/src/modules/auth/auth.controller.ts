/**
 * Authentication controller
 * Handles HTTP requests and responses for auth endpoints
 * Calls service layer for business logic
 */

import { Request, Response, NextFunction } from "express";
import { sendSuccess, sendCreated, sendError, asyncHandler } from "@/utils";
import { AuthService } from "./auth.service";
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "./auth.schemas";

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Register a new user account
   */
  registerUser = asyncHandler(async (req: Request, res: Response) => {
    const data: RegisterRequest = req.body;

    const result = await this.authService.register({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      tenantId: data.tenantName ? undefined : undefined, // New store creation happens in tenant service
      role: "customer",
    });

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendCreated(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return JWT tokens
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const data: LoginRequest = req.body;

    const result = await this.authService.login({
      email: data.email,
      password: data.password,
      ipAddress: req.ip,
    });

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccess(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token from cookie
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || (req.body as RefreshTokenRequest).refreshToken;

    if (!refreshToken) {
      return sendError(res, new Error("Refresh token not found"), 401);
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    // Set new refresh token in httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccess(res, {
      accessToken: tokens.accessToken,
    });
  });

  /**
   * POST /api/v1/auth/logout
   * Logout user by blacklisting tokens
   * Requires: accessToken in Authorization header, refreshToken in cookie
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const accessToken = (req as any).user?.token; // Set by authenticate middleware
    const refreshToken = req.cookies.refreshToken;

    if (accessToken && refreshToken) {
      await this.authService.logout(accessToken, refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    sendSuccess(res, { message: "Logged out successfully" });
  });

  /**
   * POST /api/v1/auth/forgot-password
   * Initiate password reset flow
   * Sends reset link to email (in production)
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const data: ForgotPasswordRequest = req.body;

    const result = await this.authService.forgotPassword(data.email);

    // Don't reveal if email exists (security best practice)
    sendSuccess(res, {
      message: "If an account exists with this email, a reset link will be sent",
      resetToken: process.env.NODE_ENV === "development" ? result.resetToken : undefined,
    });
  });

  /**
   * POST /api/v1/auth/reset-password
   * Complete password reset
   * Requires: reset token and new password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const data: ResetPasswordRequest = req.body;

    await this.authService.resetPassword({
      token: data.token,
      password: data.password,
    });

    sendSuccess(res, { message: "Password reset successfully" });
  });

  /**
   * GET /api/v1/auth/me
   * Get current user profile
   * Requires: valid JWT in Authorization header (set by authenticate middleware)
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    sendSuccess(res, {
      user,
    });
  });

  /**
   * POST /api/v1/auth/change-password
   * Change password for authenticated user
   * Requires: current password and new password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.sub;
    const { currentPassword, newPassword } = req.body;

    // Get user from database
    // TODO: Implement in next iteration

    sendSuccess(res, { message: "Password changed successfully" });
  });
}
