import { PrismaClient, AuditAction } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Dashboard repository
 * All query methods for metrics, audit logs, and alerts
 */
export class DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get store dashboard metrics
   * @param tenantId Tenant ID
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   */
  async getStoreMetrics(tenantId: string, startDate?: Date, endDate?: Date) {
    // Default: last 30 days
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all orders in period
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    });

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum.plus(order.totalAmount), new Decimal(0));
    const averageOrderValue = totalOrders > 0 ? totalRevenue.dividedBy(totalOrders) : new Decimal(0);

    // Today's orders (last 24 hours)
    const now = new Date();
    const today = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ordersToday = orders.filter((o) => o.createdAt >= today).length;

    // This week (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ordersWeek = orders.filter((o) => o.createdAt >= weekAgo).length;

    // This month (last 30 days)
    const ordersMonth = totalOrders;

    // Order status breakdown
    const statusBreakdown = {
      pending: orders.filter((o) => o.status === "pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      processing: orders.filter((o) => o.status === "processing").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };

    // Low stock items (below threshold)
    const lowStockItems = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        stockQuantity: {
          lte: this.prisma.raw("`product`.`low_stock_threshold`"),
        },
      },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    });

    // Top products by quantity sold
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          tenantId,
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const topProductsWithNames = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        return {
          productId: item.productId,
          productName: product?.name || "Unknown",
          quantity: item._sum.quantity || 0,
          revenue: (item._sum.totalPrice || new Decimal(0)).toString(),
        };
      })
    );

    // Recent orders (last 10)
    const recentOrders = orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);

    return {
      totalOrders,
      totalRevenue: totalRevenue.toString(),
      averageOrderValue: averageOrderValue.toString(),
      ordersToday,
      ordersThisWeek: ordersWeek,
      ordersThisMonth: ordersMonth,
      orderStatusBreakdown: statusBreakdown,
      lowStockItems: lowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        stock: item.stockQuantity,
        threshold: item.lowStockThreshold,
      })),
      topProducts: topProductsWithNames,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get platform-wide dashboard metrics (super admin only)
   */
  async getPlatformMetrics(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total tenants
    const totalTenants = await this.prisma.tenant.count();
    const activeTenants = await this.prisma.tenant.count({
      where: { status: "active" },
    });

    // Total orders in platform
    const totalOrders = await this.prisma.order.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });

    // Total revenue
    const revenueResult = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
    });
    const totalRevenue = revenueResult._sum.totalAmount || new Decimal(0);

    // Top tenants by revenue
    const topTenants = await this.prisma.order.groupBy({
      by: ["tenantId"],
      _sum: { totalAmount: true },
      _count: { id: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    });

    const topTenantsWithNames = await Promise.all(
      topTenants.map(async (item) => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: item.tenantId },
        });
        return {
          tenantId: item.tenantId,
          tenantName: tenant?.name || "Unknown",
          orders: item._count.id,
          revenue: (item._sum.totalAmount || new Decimal(0)).toString(),
        };
      })
    );

    // New tenants this week
    const weekAgo = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newTenantsWeek = await this.prisma.tenant.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    });

    return {
      totalTenants,
      activeTenants,
      totalOrders,
      totalRevenue: totalRevenue.toString(),
      topTenants: topTenantsWithNames,
      newTenantsWeek,
    };
  }

  /**
   * Get audit logs with pagination and filters
   */
  async getAuditLogs(
    tenantId: string | null,
    opts: {
      page: number;
      limit: number;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const { page, limit, action, entityType, startDate, endDate } = opts;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (action) where.action = action as AuditAction;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        actorEmail: log.actorEmail,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
      })),
      total,
      page,
      limit,
      hasNextPage: offset + limit < total,
    };
  }

  /**
   * Get low-stock alerts for a tenant
   */
  async getLowStockAlerts(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        stockQuantity: {
          lte: this.prisma.raw("`product`.`low_stock_threshold`"),
        },
      },
      orderBy: [{ stockQuantity: "asc" }],
    });

    return products.map((product) => {
      const severity =
        product.stockQuantity === 0 ? "high" : product.stockQuantity <= 5 ? "medium" : "low";
      return {
        id: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: product.stockQuantity,
        threshold: product.lowStockThreshold,
        severity,
      };
    });
  }

  /**
   * Get order status breakdown for a tenant
   */
  async getOrderStatusBreakdown(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const breakdown = await this.prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
    });

    const result: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    breakdown.forEach((item) => {
      result[item.status] = item._count.id;
    });

    return result;
  }

  /**
   * Get revenue metrics by time period
   */
  async getRevenueByPeriod(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    granularity: "daily" | "weekly" | "monthly" = "daily"
  ) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const buckets: Record<string, Decimal> = {};

    orders.forEach((order) => {
      let key: string;
      const date = order.createdAt;

      if (granularity === "daily") {
        key = date.toISOString().split("T")[0];
      } else if (granularity === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        // monthly
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!buckets[key]) {
        buckets[key] = new Decimal(0);
      }
      buckets[key] = buckets[key].plus(order.totalAmount);
    });

    return Object.entries(buckets)
      .map(([date, revenue]) => ({
        date,
        revenue: revenue.toString(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export function createDashboardRepository(prisma: PrismaClient): DashboardRepository {
  return new DashboardRepository(prisma);
}
