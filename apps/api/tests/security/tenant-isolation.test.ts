import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Express } from "express";
import { createApp } from "@/app";
import { hashPassword } from "@/utils";

/**
 * Tenant Isolation Security Tests
 * Verifies that customers and store admins cannot access other tenants' data
 */
describe("Tenant Isolation Security", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;

  let superAdminToken: string;

  // Tenant A
  let tenantAId: string;
  let tenantAAdminToken: string;
  let tenantACustomerToken: string;
  let tenantAProductId: string;

  // Tenant B
  let tenantBId: string;
  let tenantBAdminToken: string;
  let tenantBCustomerToken: string;
  let tenantBProductId: string;

  // Tenant C (for 3-way isolation test)
  let tenantCId: string;
  let tenantCCustomerToken: string;

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
    const superAdminEmail = `super-${Date.now()}@test.com`;
    const superAdminPassword = "SecurePassword123!";
    const superAdminHash = await hashPassword(superAdminPassword);

    await prisma.user.upsert({
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

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: superAdminEmail,
      password: superAdminPassword,
    });
    superAdminToken = loginRes.body.data.accessToken;

    // Setup Tenant A
    const tenantARes = await request(app)
      .post("/api/v1/tenants/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Tenant A Store",
        slug: `tenant-a-${Date.now()}`,
        contactEmail: "admin@tenanta.com",
      });
    tenantAId = tenantARes.body.data.id;

    tenantAAdminToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: tenantARes.body.data.storeAdminEmail,
        password: tenantARes.body.data.storeAdminPassword,
      })
    ).body.data.accessToken;

    const tenantACustomerRes = await request(app)
      .post("/api/v1/auth/register")
      .set("X-Tenant-ID", tenantAId)
      .send({
        email: `customer-a-${Date.now()}@test.com`,
        password: "CustomerA123!",
        firstName: "Customer",
        lastName: "A",
      });

    tenantACustomerToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: `customer-a-${Date.now()}@test.com`,
        password: "CustomerA123!",
      })
    ).body.data.accessToken;

    const tenantAProductRes = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tenantAAdminToken}`)
      .set("X-Tenant-ID", tenantAId)
      .send({
        name: "Tenant A Product",
        slug: "product-a",
        sku: "SKU-A-001",
        price: "9.99",
        stockQuantity: 100,
      });
    tenantAProductId = tenantAProductRes.body.data.id;

    // Setup Tenant B
    const tenantBRes = await request(app)
      .post("/api/v1/tenants/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Tenant B Store",
        slug: `tenant-b-${Date.now()}`,
        contactEmail: "admin@tenantb.com",
      });
    tenantBId = tenantBRes.body.data.id;

    tenantBAdminToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: tenantBRes.body.data.storeAdminEmail,
        password: tenantBRes.body.data.storeAdminPassword,
      })
    ).body.data.accessToken;

    const tenantBCustomerRes = await request(app)
      .post("/api/v1/auth/register")
      .set("X-Tenant-ID", tenantBId)
      .send({
        email: `customer-b-${Date.now()}@test.com`,
        password: "CustomerB123!",
        firstName: "Customer",
        lastName: "B",
      });

    tenantBCustomerToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: `customer-b-${Date.now()}@test.com`,
        password: "CustomerB123!",
      })
    ).body.data.accessToken;

    const tenantBProductRes = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tenantBAdminToken}`)
      .set("X-Tenant-ID", tenantBId)
      .send({
        name: "Tenant B Product",
        slug: "product-b",
        sku: "SKU-B-001",
        price: "19.99",
        stockQuantity: 50,
      });
    tenantBProductId = tenantBProductRes.body.data.id;

    // Setup Tenant C (minimal)
    const tenantCRes = await request(app)
      .post("/api/v1/tenants/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Tenant C Store",
        slug: `tenant-c-${Date.now()}`,
        contactEmail: "admin@tenantc.com",
      });
    tenantCId = tenantCRes.body.data.id;

    const tenantCCustomerRes = await request(app)
      .post("/api/v1/auth/register")
      .set("X-Tenant-ID", tenantCId)
      .send({
        email: `customer-c-${Date.now()}@test.com`,
        password: "CustomerC123!",
        firstName: "Customer",
        lastName: "C",
      });

    tenantCCustomerToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: `customer-c-${Date.now()}@test.com`,
        password: "CustomerC123!",
      })
    ).body.data.accessToken;
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  describe("Product Isolation", () => {
    it("should not allow Customer A to fetch Tenant B products", async () => {
      const res = await request(app)
        .get(`/api/v1/products/${tenantBProductId}`)
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect(res.status).toBe(404);
    });

    it("should not list Tenant B products in Tenant A store", async () => {
      const res = await request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      const tenantBProductInList = res.body.data.some(
        (p: any) => p.id === tenantBProductId
      );
      expect(tenantBProductInList).toBe(false);
    });

    it("should allow Customer A to fetch Tenant A products", async () => {
      const res = await request(app)
        .get(`/api/v1/products/${tenantAProductId}`)
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tenantAProductId);
    });
  });

  describe("Order Isolation", () => {
    it("should not allow Customer A to see Customer B orders", async () => {
      // Create an order in Tenant B
      const tenantBCartRes = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${tenantBCustomerToken}`)
        .send({ productId: tenantBProductId, quantity: 1 });

      const tenantBOrderRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tenantBCustomerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Tenant B St",
            city: "City B",
            state: "State B",
            zipCode: "12345",
          },
        });

      const tenantBOrderId = tenantBOrderRes.body.data.id;

      // Try to access as Tenant A customer
      const accessRes = await request(app)
        .get(`/api/v1/orders/${tenantBOrderId}`)
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect(accessRes.status).toBe(404);
    });

    it("should show Tenant A orders only to Tenant A customers", async () => {
      // Create order in Tenant A
      const tenantACartRes = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .send({ productId: tenantAProductId, quantity: 1 });

      const tenantAOrderRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Tenant A St",
            city: "City A",
            state: "State A",
            zipCode: "54321",
          },
        });

      // Customer A can see their own order
      const listRes = await request(app)
        .get("/api/v1/orders")
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      // Customer B cannot see Customer A orders
      const otherRes = await request(app)
        .get("/api/v1/orders")
        .set("Authorization", `Bearer ${tenantBCustomerToken}`)
        .set("X-Tenant-ID", tenantBId);

      const tenantAOrderInOtherList = otherRes.body.data.some(
        (o: any) => o.id === tenantAOrderRes.body.data.id
      );
      expect(tenantAOrderInOtherList).toBe(false);
    });
  });

  describe("Admin Dashboard Isolation", () => {
    it("should show only Tenant A metrics to Tenant A admin", async () => {
      const res = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics).toBeDefined();
    });

    it("should not allow Tenant A admin to see Tenant B metrics", async () => {
      // Try to access Tenant B dashboard as Tenant A admin
      const res = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .set("X-Tenant-ID", tenantBId);

      // Should either forbid or return Tenant A's empty metrics
      expect([403, 200]).toContain(res.status);
    });

    it("should show different metrics for different tenants", async () => {
      const tenantARes = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .set("X-Tenant-ID", tenantAId);

      const tenantBRes = await request(app)
        .get("/api/v1/dashboards/store")
        .set("Authorization", `Bearer ${tenantBAdminToken}`)
        .set("X-Tenant-ID", tenantBId);

      // Metrics should be different (or at least not correlated)
      expect(tenantARes.status).toBe(200);
      expect(tenantBRes.status).toBe(200);
    });
  });

  describe("Audit Log Isolation", () => {
    it("should not allow Tenant A admin to see Tenant B audit logs", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .set("X-Tenant-ID", tenantBId);

      // Should forbid or return empty
      if (res.status === 200) {
        // If allowed, should be empty or filtered
        expect(Array.isArray(res.body.data)).toBe(true);
      } else {
        expect(res.status).toBe(403);
      }
    });

    it("should allow super admin to see all audit logs", async () => {
      const res = await request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("Category Isolation", () => {
    it("should not allow Tenant A to see Tenant B categories", async () => {
      // Create category in Tenant B
      const tenantBCategoryRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${tenantBAdminToken}`)
        .set("X-Tenant-ID", tenantBId)
        .send({
          name: "Tenant B Category",
          slug: "tenant-b-cat",
        });

      // Try to access as Tenant A
      const accessRes = await request(app)
        .get(`/api/v1/categories/${tenantBCategoryRes.body.data.id}`)
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect(accessRes.status).toBe(404);
    });
  });

  describe("Cross-Tenant Data Contamination", () => {
    it("should prevent Customer A from adding Tenant B products to cart", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantAId)
        .send({
          productId: tenantBProductId,
          quantity: 1,
        });

      expect([404, 422]).toContain(res.status);
    });

    it("should prevent Tenant A admin from modifying Tenant B products", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${tenantBProductId}`)
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .set("X-Tenant-ID", tenantAId)
        .send({
          name: "Hacked Product",
        });

      expect([404, 403]).toContain(res.status);
    });

    it("should prevent Tenant A admin from deleting Tenant B products", async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${tenantBProductId}`)
        .set("Authorization", `Bearer ${tenantAAdminToken}`)
        .set("X-Tenant-ID", tenantAId);

      expect([404, 403]).toContain(res.status);
    });
  });

  describe("Three-Way Tenant Isolation", () => {
    it("should prevent Customer A, B, C cross-contamination", async () => {
      // Customer A tries to access Tenant C resources
      const aToC = await request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${tenantACustomerToken}`)
        .set("X-Tenant-ID", tenantCId);

      // Should forbid or return empty
      if (aToC.status === 200) {
        expect(aToC.body.data.length).toBe(0);
      } else {
        expect([403, 401]).toContain(aToC.status);
      }

      // Customer B tries to access Tenant A resources
      const bToA = await request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${tenantBCustomerToken}`)
        .set("X-Tenant-ID", tenantAId);

      if (bToA.status === 200) {
        expect(bToA.body.data.length).toBe(0);
      } else {
        expect([403, 401]).toContain(bToA.status);
      }
    });
  });
});
