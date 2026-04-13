import { z } from "zod";

/**
 * Dashboard query parameters and validation schemas
 */

/**
 * Store dashboard query schema
 * Optional date range for filtering metrics
 */
export const getStoreDashboardSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type GetStoreDashboardQuery = z.infer<typeof getStoreDashboardSchema>;

/**
 * Platform dashboard query schema (super admin)
 */
export const getAdminDashboardSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type GetAdminDashboardQuery = z.infer<typeof getAdminDashboardSchema>;

/**
 * Audit logs list query schema
 * Supports pagination and filtering by action/entity type/date range
 */
export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z
    .enum([
      "CREATE",
      "UPDATE",
      "DELETE",
      "LOGIN",
      "LOGOUT",
      "ORDER_STATUS_CHANGE",
      "STOCK_UPDATE",
      "TENANT_SUSPEND",
    ])
    .optional(),
  entityType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema>;

/**
 * Low-stock alerts query schema
 */
export const listAlertsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  severity: z.enum(["low", "medium", "high"]).optional(),
});

export type ListAlertsQuery = z.infer<typeof listAlertsSchema>;

/**
 * Order metrics query schema
 */
export const getOrderMetricsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type GetOrderMetricsQuery = z.infer<typeof getOrderMetricsSchema>;
