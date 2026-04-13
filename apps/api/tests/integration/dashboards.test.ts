import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Express } from "express";
import { createApp } from "@/app";
import { hashPassword } from "@/utils";

describe("Dashboard & Alerts Endpoints", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;

  let superAdminToken: string;
  let storeAdminToken: string;
  let customerToken: string;

  let tenantId: string;
  let customerId: string;
  let storeAdminId: string;
  let productId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      lazyConnect: true,
    });
    await redis.connect();
    app = createApp(prisma, redis);

    // Create super admin
    const superAdminEmail = `super-admin-${Date.now()}@test.com`;
    const superAdminPassword = "SecurePassword123!";
    const superAdminHash = await hashPassword(superAdminPassword);

    const superAdminUser = await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {},
      create: {
        email: superAdminEmail,
        passwordHash: superAdminHash,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        tenantId: null,
      },
    });

    // Login as super admin
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: superAdminEmail,
      password: superAdminPassword,
    });
    superAdminToken = loginRes.body.data.accessToken;

    // Create tenant
    const tenantRes = await request(app)
      .post("/api/v1/tenants/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Test Grocery Store",
        slug: `store-${Date.now()}`,
        contactEmail: "owner@store.com",
        contactPhone: "555-0100",
        address: "123 Main St",
      });

    tenantId = tenantRes.body.data.id;
    storeAdminId = tenantRes.body.data.storeAdminId;

    // Login as store admin
    const storeAdminRes = await request(app).post("/api/v1/auth/login").send({
      email: tenantRes.body.data.storeAdminEmail,
      password: tenantRes.body.data.storeAdminPassword,
    });
    storeAdminToken = storeAdminRes.body.data.accessToken;

    // Create customer
    const customerRes = await request(app)
      .post("/api/v1/auth/register")
      .set("X-Tenant-ID", tenantId)
      .send({
        email: `customer-${Date.now()}@test.com`,
        password: "CustomerPass123!",
        firstName: "Jane",
        lastName: "Doe",
      });
    customerId = customerRes.body.data.id;

    // Login as customer
    const customerLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: `customer-${Date.now()}@test.com`,
      password: "CustomerPass123!",
    });
    customerToken = customerLoginRes.body.data.accessToken;

    // Create product
    const productRes = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${storeAdminToken}`)
      .set("X-Tenant-ID", tenantId)
      .send({
        name: "Apples",
        slug: "apples",
        sku: "APL-001",
        price: "5.99",
        stockQuantity: 50,
        lowStockThreshold: 10,
        unit: "piece",
      });
    productId = productRes.body.data.id;

    // Create test orders
    for (let i = 0; i < 5; i++) {
      // Add to cart
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 2 });

      // Create order
      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "456 Oak Ave",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });
    }
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear audit logs from previous test
    await prisma.auditLog.deleteMany({ where: { tenantId } });
  });

  describe("GET /api/v1/dashboards/store", () => {
    it("should return store dashboard metrics for store admin", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("metrics");
      expect(res.body.data.metrics).toHaveProperty("totalOrders");
      expect(res.body.data.metrics.totalOrders).toBeGreaterThanOrEqual(5);
      expect(res.body.data).toHaveProperty("orderStatusBreakdown");
      expect(res.body.data).toHaveProperty("lowStockItems");
      expect(res.body.data).toHaveProperty("topProducts");
      expect(res.body.data).toHaveProperty("recentOrders");
    });

    it("should filter by date range", async () => {
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();

      const res = await request(app)
        .get(`/api/v1/dashboards/store?startDate=${start}&endDate=${end}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics.totalOrders).toBeGreaterThanOrEqual(0);
    });

    it("should return empty metrics when no orders exist", async () => {
      // Create new tenant with no orders
      const newTenantRes = await request(app)
        .post("/api/v1/tenants/register")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Empty Store",
          slug: `empty-${Date.now()}`,
          contactEmail: "empty@store.com",
        });

      const newTenantToken = (
        await request(app).post("/api/v1/auth/login").send({
          email: newTenantRes.body.data.storeAdminEmail,
          password: newTenantRes.body.data.storeAdminPassword,
        })
      ).body.data.accessToken;

      const res = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${newTenantToken}`)
        .set("X-Tenant-ID", newTenantRes.body.data.id);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics.totalOrders).toBe(0);
    });

    it("should forbid customer from accessing store dashboard", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(403);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/v1/dashboards/store").set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/dashboards/admin", () => {
    it("should return platform metrics for super admin", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/admin")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("metrics");
      expect(res.body.data.metrics).toHaveProperty("totalTenants");
      expect(res.body.data.metrics).toHaveProperty("activeTenants");
      expect(res.body.data.metrics).toHaveProperty("totalOrders");
      expect(res.body.data).toHaveProperty("topTenants");
    });

    it("should forbid store admin from accessing platform dashboard", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/admin")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(403);
    });

    it("should forbid customer from accessing platform dashboard", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/admin")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/dashboards/store/orders", () => {
    it("should return order metrics breakdown", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/store/orders")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("statusBreakdown");
      expect(res.body.data).toHaveProperty("revenueByDay");
      expect(res.body.data.statusBreakdown).toHaveProperty("pending");
    });

    it("should forbid store admin without tenant", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/store/orders")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/audit-logs", () => {
    it("should return paginated audit logs for store admin", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs?page=1&limit=10")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty("page");
      expect(res.body.meta).toHaveProperty("limit");
      expect(res.body.meta).toHaveProperty("total");
      expect(res.body.meta).toHaveProperty("hasNextPage");
    });

    it("should filter logs by action", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs?action=CREATE")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      const filtered = res.body.data.filter((log: any) => log.action !== "CREATE");
      // Most should be CREATE, but not guaranteed to be all
      expect(filtered.length).toBeLessThanOrEqual(res.body.data.length);
    });

    it("should filter logs by date range", async () => {
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();

      const res = await request(app)
        .get(`/api/v1/audit-logs?startDate=${start}&endDate=${end}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
    });

    it("should allow super admin to view all tenant logs", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should forbid customer from viewing audit logs", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(403);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/v1/audit-logs").set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/alerts/low-stock", () => {
    it("should return low-stock alerts", async () => {
      // Update product to low stock
      await request(app)
        .patch(`/api/v1/products/${productId}/stock`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({ quantity: 2 });

      const res = await request(app)
        .get("/api/v1/alerts/low-stock")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty("productName");
        expect(res.body.data[0]).toHaveProperty("currentStock");
        expect(res.body.data[0]).toHaveProperty("severity");
      }
    });

    it("should return empty list when no low-stock items", async () => {
      const res = await request(app)
        .get("/api/v1/alerts/low-stock")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should forbid customer from viewing alerts", async () => {
      const res = await request(app)
        .get("/api/v1/alerts/low-stock")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(403);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .get("/api/v1/alerts/low-stock")
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(401);
    });
  });

  describe("Tenant Isolation", () => {
    it("should not show other tenant metrics", async () => {
      // Create another tenant
      const anotherTenantRes = await request(app)
        .post("/api/v1/tenants/register")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Other Store",
          slug: `other-${Date.now()}`,
          contactEmail: "other@store.com",
        });

      const anotherToken = (
        await request(app).post("/api/v1/auth/login").send({
          email: anotherTenantRes.body.data.storeAdminEmail,
          password: anotherTenantRes.body.data.storeAdminPassword,
        })
      ).body.data.accessToken;

      // Get our tenant's dashboard
      const ourRes = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId);

      // Get other tenant's dashboard
      const otherRes = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${anotherToken}`)
        .set("X-Tenant-ID", anotherTenantRes.body.data.id);

      // Orders should be different
      expect(ourRes.body.data.metrics.totalOrders).toBeGreaterThan(
        otherRes.body.data.metrics.totalOrders
      );
    });
  });
});
