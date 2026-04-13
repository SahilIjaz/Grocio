import { PrismaClient } from "@prisma/client";
import { DashboardRepository, createDashboardRepository } from "./dashboard.repository";
import { GetStoreDashboardQuery, GetAdminDashboardQuery, ListAuditLogsQuery, ListAlertsQuery } from "./dashboard.schemas";
import { ForbiddenError } from "@/utils";

/**
 * Store dashboard response
 */
export interface StoreDashboardResponse {
  metrics: {
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    ordersToday: number;
    ordersThisWeek: number;
    ordersThisMonth: number;
  };
  orderStatusBreakdown: Record<string, number>;
  lowStockItems: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    threshold: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: string;
    createdAt: string;
  }>;
}

/**
 * Platform dashboard response
 */
export interface PlatformDashboardResponse {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    totalOrders: number;
    totalRevenue: string;
    newTenantsWeek: number;
  };
  topTenants: Array<{
    tenantId: string;
    tenantName: string;
    orders: number;
    revenue: string;
  }>;
}

/**
 * Dashboard service
 */
export class DashboardService {
  private dashboardRepo: DashboardRepository;

  constructor(private prisma: PrismaClient) {
    this.dashboardRepo = createDashboardRepository(prisma);
  }

  /**
   * Get store dashboard for a tenant
   * Store admins can view their own dashboard
   * Customers get a minimal view (if needed)
   */
  async getStoreDashboard(
    tenantId: string,
    userRole: string,
    opts: GetStoreDashboardQuery
  ): Promise<StoreDashboardResponse> {
    // Store admin and customer can access store dashboard (customer sees limited data)
    if (userRole !== "store_admin" && userRole !== "customer") {
      throw new ForbiddenError("Only store admins can access store dashboard");
    }

    const startDate = opts.startDate ? new Date(opts.startDate) : undefined;
    const endDate = opts.endDate ? new Date(opts.endDate) : undefined;

    const metrics = await this.dashboardRepo.getStoreMetrics(tenantId, startDate, endDate);

    return {
      metrics: {
        totalOrders: metrics.totalOrders,
        totalRevenue: metrics.totalRevenue,
        averageOrderValue: metrics.averageOrderValue,
        ordersToday: metrics.ordersToday,
        ordersThisWeek: metrics.ordersThisWeek,
        ordersThisMonth: metrics.ordersThisMonth,
      },
      orderStatusBreakdown: metrics.orderStatusBreakdown,
      lowStockItems: metrics.lowStockItems,
      topProducts: metrics.topProducts,
      recentOrders: metrics.recentOrders,
    };
  }

  /**
   * Get platform dashboard (super admin only)
   */
  async getPlatformDashboard(opts: GetAdminDashboardQuery): Promise<PlatformDashboardResponse> {
    const startDate = opts.startDate ? new Date(opts.startDate) : undefined;
    const endDate = opts.endDate ? new Date(opts.endDate) : undefined;

    const metrics = await this.dashboardRepo.getPlatformMetrics(startDate, endDate);

    return {
      metrics: {
        totalTenants: metrics.totalTenants,
        activeTenants: metrics.activeTenants,
        totalOrders: metrics.totalOrders,
        totalRevenue: metrics.totalRevenue,
        newTenantsWeek: metrics.newTenantsWeek,
      },
      topTenants: metrics.topTenants,
    };
  }

  /**
   * Get audit logs
   * Store admins see their tenant's logs only
   * Super admins see all logs or filtered by tenant
   */
  async getAuditLogs(
    tenantId: string | null,
    userRole: string,
    opts: ListAuditLogsQuery
  ) {
    // Only store_admin and super_admin can view logs
    if (userRole !== "store_admin" && userRole !== "super_admin") {
      throw new ForbiddenError("Only admins can view audit logs");
    }

    // Store admin can only see their own tenant's logs
    if (userRole === "store_admin" && !tenantId) {
      throw new ForbiddenError("Store admins can only view their tenant's logs");
    }

    const queryTenantId = userRole === "super_admin" ? null : tenantId;

    return this.dashboardRepo.getAuditLogs(queryTenantId, {
      page: opts.page,
      limit: opts.limit,
      action: opts.action,
      entityType: opts.entityType,
      startDate: opts.startDate ? new Date(opts.startDate) : undefined,
      endDate: opts.endDate ? new Date(opts.endDate) : undefined,
    });
  }

  /**
   * Get low-stock alerts for a tenant
   */
  async getLowStockAlerts(tenantId: string, userRole: string) {
    if (userRole !== "store_admin" && userRole !== "super_admin") {
      throw new ForbiddenError("Only admins can view alerts");
    }

    return this.dashboardRepo.getLowStockAlerts(tenantId);
  }

  /**
   * Get order metrics (status breakdown, revenue by period)
   */
  async getOrderMetrics(tenantId: string, userRole: string, opts: any) {
    if (userRole !== "store_admin") {
      throw new ForbiddenError("Only store admins can view order metrics");
    }

    const startDate = opts.startDate ? new Date(opts.startDate) : undefined;
    const endDate = opts.endDate ? new Date(opts.endDate) : undefined;

    const [statusBreakdown, revenue] = await Promise.all([
      this.dashboardRepo.getOrderStatusBreakdown(tenantId, startDate, endDate),
      this.dashboardRepo.getRevenueByPeriod(tenantId, startDate, endDate, "daily"),
    ]);

    return {
      statusBreakdown,
      revenueByDay: revenue,
    };
  }
}

export function createDashboardService(prisma: PrismaClient): DashboardService {
  return new DashboardService(prisma);
}
