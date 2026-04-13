import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { DashboardController, createDashboardController } from "./dashboard.controller";
import { DashboardService, createDashboardService } from "./dashboard.service";
import { authorize, validateQuery } from "@/middleware";
import {
  getStoreDashboardSchema,
  getAdminDashboardSchema,
  listAuditLogsSchema,
  listAlertsSchema,
  getOrderMetricsSchema,
} from "./dashboard.schemas";

/**
 * Create dashboard router
 * All routes require authentication
 *
 * Routes:
 *   GET  /store                 Store dashboard metrics (store_admin)
 *   GET  /admin                 Platform dashboard (super_admin)
 *   GET  /store/orders          Order metrics (store_admin)
 *
 * Audit logs & alerts:
 *   GET  /audit-logs            Audit log list (store_admin, super_admin)
 *   GET  /alerts/low-stock      Low-stock alerts (store_admin)
 *
 * @param prisma Prisma client
 * @returns Express router
 */
export function createDashboardRouter(prisma: PrismaClient): Router {
  const router = Router();

  const dashboardService = createDashboardService(prisma);
  const dashboardController = createDashboardController(dashboardService);

  /**
   * GET /api/v1/dashboards/store
   * Get store dashboard with metrics
   * Required: authenticated (store_admin)
   *
   * @query {string} startDate - Optional ISO date (default: 30 days ago)
   * @query {string} endDate - Optional ISO date (default: now)
   * @returns {object} Dashboard with metrics, breakdown, alerts, top products
   *
   * @example
   * GET /api/v1/dashboards/store?startDate=2026-04-01&endDate=2026-04-13
   * Authorization: Bearer <storeAdminToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "metrics": {
   *       "totalOrders": 42,
   *       "totalRevenue": "1250.50",
   *       "averageOrderValue": "29.77",
   *       "ordersToday": 5,
   *       "ordersThisWeek": 18,
   *       "ordersThisMonth": 42
   *     },
   *     "orderStatusBreakdown": {
   *       "pending": 3,
   *       "confirmed": 5,
   *       "processing": 2,
   *       "shipped": 10,
   *       "delivered": 20,
   *       "cancelled": 2
   *     },
   *     "lowStockItems": [...],
   *     "topProducts": [...],
   *     "recentOrders": [...]
   *   }
   * }
   */
  router.get(
    "/store",
    authorize("store_admin", "customer"),
    validateQuery(getStoreDashboardSchema),
    dashboardController.getStoreDashboard
  );

  /**
   * GET /api/v1/dashboards/admin
   * Get platform dashboard (super admin only)
   * Required: super_admin
   *
   * @query {string} startDate - Optional ISO date (default: 30 days ago)
   * @query {string} endDate - Optional ISO date (default: now)
   * @returns {object} Platform metrics with top tenants
   *
   * @example
   * GET /api/v1/dashboards/admin
   * Authorization: Bearer <superAdminToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "metrics": {
   *       "totalTenants": 12,
   *       "activeTenants": 10,
   *       "totalOrders": 340,
   *       "totalRevenue": "8540.20",
   *       "newTenantsWeek": 2
   *     },
   *     "topTenants": [...]
   *   }
   * }
   */
  router.get(
    "/admin",
    authorize("super_admin"),
    validateQuery(getAdminDashboardSchema),
    dashboardController.getPlatformDashboard
  );

  /**
   * GET /api/v1/dashboards/store/orders
   * Get order metrics (status breakdown, revenue trends)
   * Required: store_admin
   *
   * @query {string} startDate - Optional ISO date
   * @query {string} endDate - Optional ISO date
   * @returns {object} Status breakdown and revenue by day
   *
   * @example
   * GET /api/v1/dashboards/store/orders
   * Authorization: Bearer <storeAdminToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "statusBreakdown": { "pending": 3, ... },
   *     "revenueByDay": [
   *       { "date": "2026-04-13", "revenue": "145.50" }
   *     ]
   *   }
   * }
   */
  router.get(
    "/store/orders",
    authorize("store_admin"),
    validateQuery(getOrderMetricsSchema),
    dashboardController.getOrderMetrics
  );

  /**
   * GET /api/v1/audit-logs
   * Get audit logs with filtering and pagination
   * Required: store_admin (own logs), super_admin (all logs)
   *
   * @query {number} page - Page number (default 1)
   * @query {number} limit - Items per page (default 20, max 100)
   * @query {string} action - Filter by action (CREATE, UPDATE, DELETE, etc.)
   * @query {string} entityType - Filter by entity type (Order, Product, etc.)
   * @query {string} startDate - Filter by date range start
   * @query {string} endDate - Filter by date range end
   * @returns {array} Audit log entries
   *
   * @example
   * GET /api/v1/audit-logs?page=1&limit=20&action=CREATE&entityType=Order
   * Authorization: Bearer <storeAdminToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": [
   *     { "timestamp": "...", "actorEmail": "...", "action": "CREATE", "entityType": "Order", ... }
   *   ],
   *   "meta": { "page": 1, "limit": 20, "total": 45, "hasNextPage": true }
   * }
   */
  router.get(
    "/audit-logs",
    authorize("store_admin", "super_admin"),
    validateQuery(listAuditLogsSchema),
    dashboardController.getAuditLogs
  );

  /**
   * GET /api/v1/alerts/low-stock
   * Get low-stock alert items
   * Required: store_admin
   *
   * @returns {array} Products below stock threshold with severity
   *
   * @example
   * GET /api/v1/alerts/low-stock
   * Authorization: Bearer <storeAdminToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "...",
   *       "productName": "Apples",
   *       "sku": "APL-001",
   *       "currentStock": 2,
   *       "threshold": 10,
   *       "severity": "high"
   *     }
   *   ]
   * }
   */
  router.get(
    "/alerts/low-stock",
    authorize("store_admin"),
    dashboardController.getLowStockAlerts
  );

  return router;
}

export default createDashboardRouter;
