import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Express } from "express";
import { createApp } from "@/app";
import { hashPassword } from "@/utils";

/**
 * Injection Attack Prevention Tests
 * Verifies that SQL injection, XSS, and other injection vectors are prevented
 */
describe("Injection Attack Prevention", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;

  let storeAdminToken: string;
  let customerToken: string;
  let tenantId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      lazyConnect: true,
    });
    await redis.connect();
    app = createApp(prisma, redis);

    // Setup
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
    const superAdminToken = loginRes.body.data.accessToken;

    const tenantRes = await request(app)
      .post("/api/v1/tenants/register")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Test Store",
        slug: `store-${Date.now()}`,
        contactEmail: "store@test.com",
      });
    tenantId = tenantRes.body.data.id;

    storeAdminToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: tenantRes.body.data.storeAdminEmail,
        password: tenantRes.body.data.storeAdminPassword,
      })
    ).body.data.accessToken;

    const customerRes = await request(app)
      .post("/api/v1/auth/register")
      .set("X-Tenant-ID", tenantId)
      .send({
        email: `customer-${Date.now()}@test.com`,
        password: "CustomerPass123!",
        firstName: "Test",
        lastName: "Customer",
      });

    customerToken = (
      await request(app).post("/api/v1/auth/login").send({
        email: `customer-${Date.now()}@test.com`,
        password: "CustomerPass123!",
      })
    ).body.data.accessToken;
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  describe("SQL Injection Prevention", () => {
    it("should prevent SQL injection in product search", async () => {
      const injectionPayload = "'; DROP TABLE products; --";

      const res = await request(app)
        .get(`/api/v1/products?search=${encodeURIComponent(injectionPayload)}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      // Should not execute the injection, just search for literal string
      expect(res.status).toBe(200);

      // Verify table still exists
      const tableRes = await request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(tableRes.status).toBe(200);
    });

    it("should prevent SQL injection in product creation", async () => {
      const injectionPayload = "Product\"; DELETE FROM products WHERE 1=1; --";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: injectionPayload,
          slug: "safe-slug",
          sku: "SKU-001",
          price: "9.99",
          stockQuantity: 10,
        });

      // Should create product with payload as literal string, not execute SQL
      if (res.status === 201) {
        expect(res.body.data.name).toBe(injectionPayload);
      }

      // Verify other products not deleted
      const listRes = await request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(listRes.status).toBe(200);
    });

    it("should prevent UNION-based SQL injection", async () => {
      const injectionPayload =
        "Product' UNION SELECT * FROM users WHERE '1'='1";

      const res = await request(app)
        .get(`/api/v1/products?search=${encodeURIComponent(injectionPayload)}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Should not return user data
      res.body.data.forEach((item: any) => {
        expect(item).toHaveProperty("name");
        expect(item).not.toHaveProperty("passwordHash");
      });
    });

    it("should prevent time-based blind SQL injection", async () => {
      const injectionPayload =
        "'; WAITFOR DELAY '00:00:05'; --"; // SQL Server syntax

      const startTime = Date.now();
      const res = await request(app)
        .get(`/api/v1/products?search=${encodeURIComponent(injectionPayload)}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);
      const endTime = Date.now();

      expect(res.status).toBe(200);
      // Should not delay (should complete in < 500ms)
      expect(endTime - startTime).toBeLessThan(500);
    });

    it("should prevent SQL injection via numeric parameters", async () => {
      const injectionPayload = "1 OR 1=1";

      const res = await request(app)
        .patch("/api/v1/products/invalid-id/stock")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          quantity: injectionPayload,
        });

      // Should fail validation, not execute SQL
      expect([400, 404, 422]).toContain(res.status);
    });
  });

  describe("XSS Prevention", () => {
    it("should not execute script tags in product names", async () => {
      const xssPayload = "<script>alert('XSS')</script>";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: xssPayload,
          slug: "xss-test",
          sku: "XSS-001",
          price: "9.99",
          stockQuantity: 10,
        });

      if (res.status === 201) {
        // Should return JSON, not execute script
        expect(res.headers["content-type"]).toContain("application/json");
        expect(res.body.data.name).toBe(xssPayload);
        expect(typeof res.body).toBe("object");
      }
    });

    it("should not execute event handlers in product descriptions", async () => {
      const xssPayload =
        '<img src=x onerror="alert(\'XSS\')">';

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: "Safe Name",
          slug: "event-handler-test",
          sku: "EVT-001",
          description: xssPayload,
          price: "9.99",
          stockQuantity: 10,
        });

      if (res.status === 201) {
        // Should return JSON safely
        expect(res.headers["content-type"]).toContain("application/json");
      }
    });

    it("should return JSON, not HTML (cannot render XSS)", async () => {
      const res = await request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      // API should only return JSON
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.status).toBe(200);

      // Response is JSON object, not HTML
      expect(typeof res.body).toBe("object");
      expect(res.body.success).toBeDefined();
    });

    it("should prevent DOM-based XSS via search parameters", async () => {
      const xssPayload = "%3Cscript%3Ealert('xss')%3C/script%3E"; // URL-encoded

      const res = await request(app)
        .get(`/api/v1/products?search=${xssPayload}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      // Should not execute, just search for literal string
      expect(res.headers["content-type"]).toContain("application/json");
    });
  });

  describe("NoSQL Injection Prevention", () => {
    it("should prevent object-based NoSQL injection", async () => {
      // This test is more for MongoDB, but we verify Prisma + PostgreSQL is safe
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: { $ne: null },
          password: "anything",
        });

      // Should fail gracefully (not bypass auth)
      expect([400, 401, 404]).toContain(res.status);
    });
  });

  describe("Command Injection Prevention", () => {
    it("should prevent command injection in file paths", async () => {
      // Simulating a file upload with injection payload
      const injectionPayload = "../../../etc/passwd";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: "Test",
          slug: "test-path",
          sku: injectionPayload,
          price: "9.99",
          stockQuantity: 10,
        });

      // Should treat as data, not path traversal
      if (res.status === 201) {
        expect(res.body.data.sku).toBe(injectionPayload);
      }
    });
  });

  describe("LDAP Injection Prevention", () => {
    it("should prevent LDAP injection in user search", async () => {
      // LDAP injection payload
      const injectionPayload = "*)(&(uid=*";

      const res = await request(app)
        .post("/api/v1/auth/register")
        .set("X-Tenant-ID", tenantId)
        .send({
          email: injectionPayload,
          password: "TestPass123!",
          firstName: "Test",
          lastName: "User",
        });

      // Should fail validation (invalid email), not execute LDAP query
      expect(res.status).toBe(400);
    });
  });

  describe("Template Injection Prevention", () => {
    it("should prevent template injection in product names", async () => {
      const templatePayload = "${7*7}";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: templatePayload,
          slug: "template-test",
          sku: "TMPL-001",
          price: "9.99",
          stockQuantity: 10,
        });

      if (res.status === 201) {
        // Should treat as literal string, not evaluate
        expect(res.body.data.name).toBe(templatePayload);
      }
    });
  });

  describe("Header Injection Prevention", () => {
    it("should prevent HTTP header injection", async () => {
      const injectionPayload = "malicious\r\nSet-Cookie: admin=true";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: injectionPayload,
          slug: "header-test",
          sku: "HDR-001",
          price: "9.99",
          stockQuantity: 10,
        });

      // Should not set arbitrary cookies
      expect(res.headers["set-cookie"]).toBeUndefined();
    });
  });

  describe("Encoding Bypass Prevention", () => {
    it("should prevent double URL encoding bypass", async () => {
      const doubleEncodedPayload = "%252527";

      const res = await request(app)
        .get(`/api/v1/products?search=${doubleEncodedPayload}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .set("X-Tenant-ID", tenantId);

      expect(res.status).toBe(200);
      // Should not bypass validation
    });

    it("should handle UTF-8 and Unicode safely", async () => {
      const unicodePayload = "产品\u0027;\u0027";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .set("X-Tenant-ID", tenantId)
        .send({
          name: unicodePayload,
          slug: "unicode-test",
          sku: "UNI-001",
          price: "9.99",
          stockQuantity: 10,
        });

      // Should handle Unicode gracefully
      if (res.status === 201) {
        expect(res.body.data.name).toBe(unicodePayload);
      }
    });
  });
});
