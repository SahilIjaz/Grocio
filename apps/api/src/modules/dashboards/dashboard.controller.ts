import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";
import { sendSuccess } from "@/utils";
import { asyncHandler } from "@/utils";

/**
 * Dashboard controller
 */
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  /**
   * GET /api/v1/dashboards/store
   * Get store dashboard metrics
   */
  getStoreDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userRole = req.user!.role;

    const result = await this.dashboardService.getStoreDashboard(tenantId, userRole, req.query as any);

    sendSuccess(res, result, 200);
  });

  /**
   * GET /api/v1/dashboards/admin
   * Get platform dashboard (super admin only)
   */
  getPlatformDashboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.getPlatformDashboard(req.query as any);

    sendSuccess(res, result, 200);
  });

  /**
   * GET /api/v1/audit-logs
   * Get audit logs with pagination and filters
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userRole = req.user!.role;
    const query = (req as any).validatedQuery;

    const result = await this.dashboardService.getAuditLogs(tenantId, userRole, query);

    sendSuccess(res, result.logs, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasNextPage: result.hasNextPage,
    });
  });

  /**
   * GET /api/v1/alerts/low-stock
   * Get low-stock alerts
   */
  getLowStockAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userRole = req.user!.role;

    const alerts = await this.dashboardService.getLowStockAlerts(tenantId, userRole);

    sendSuccess(res, alerts, 200);
  });

  /**
   * GET /api/v1/dashboards/store/orders
   * Get order metrics (status breakdown, revenue)
   */
  getOrderMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userRole = req.user!.role;

    const metrics = await this.dashboardService.getOrderMetrics(tenantId, userRole, req.query);

    sendSuccess(res, metrics, 200);
  });
}

/**
 * Factory function to create dashboard controller
 */
export function createDashboardController(dashboardService: DashboardService): DashboardController {
  return new DashboardController(dashboardService);
}
