/**
 * Tenant module integration tests
 * Tests all CRUD operations, authorization, and business logic
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "@/app";
import { Express } from "express";
import Redis from "ioredis";

describe("Tenant Module", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;
  let superAdminToken: string;
  let storeAdminToken: string;
  let tenantId: string;
  let storeAdminId: string;

  beforeAll(async () => {
    // Initialize Prisma and Redis clients
    prisma = new PrismaClient();
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    });

    // Create Express app
    app = createApp(prisma, redis);

    // Seed super admin
    const superAdminPassword = await import("@/utils/password").then((m) =>
      m.hashPassword("SuperAdmin123!")
    );
    const superAdmin = await prisma.user.upsert({
      where: { email: "test-super-admin@grocio.local" },
      update: {},
      create: {
        email: "test-super-admin@grocio.local",
        firstName: "Test",
        lastName: "SuperAdmin",
        passwordHash: superAdminPassword,
        role: "super_admin",
        tenantId: null,
        isActive: true,
      },
    });

    // Get super admin token
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "test-super-admin@grocio.local",
      password: "SuperAdmin123!",
    });
    superAdminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({
      where: { email: { contains: "test-tenant" } },
    });
    await prisma.tenant.deleteMany({
      where: { slug: { contains: "test-tenant" } },
    });
  });

  describe("POST /api/v1/tenants (Register Tenant)", () => {
    it("should successfully register a new tenant with store admin", async () => {
      const res = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-001",
        contactEmail: "contact@test-tenant.com",
        contactPhone: "+1-234-567-8900",
        address: "123 Test St",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "test-tenant-owner@example.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
        settings: {
          currency: "USD",
          timezone: "America/New_York",
          taxRate: 0.08,
          deliveryFee: 5.0,
          orderPrefix: "TEST",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.name).toBe("Test Tenant Store");
      expect(res.body.data.tenant.slug).toBe("test-tenant-001");
      expect(res.body.data.tenant.status).toBe("active");
      expect(res.body.data.storeAdmin.role).toBe("store_admin");

      tenantId = res.body.data.tenant.id;
      storeAdminId = res.body.data.storeAdmin.id;
    });

    it("should reject duplicate slug", async () => {
      // First registration
      await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-dup",
        contactEmail: "contact1@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner1@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      // Second registration with same slug
      const res = await request(app).post("/api/v1/tenants").send({
        name: "Another Store",
        slug: "test-tenant-dup",
        contactEmail: "contact2@test-tenant.com",
        ownerFirstName: "Jane",
        ownerLastName: "Doe",
        ownerEmail: "owner2@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("slug");
    });

    it("should reject duplicate owner email", async () => {
      const email = "duplicate-owner@test-tenant.com";

      // First registration
      await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store 1",
        slug: "test-tenant-001",
        contactEmail: "contact1@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: email,
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      // Second registration with same owner email
      const res = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store 2",
        slug: "test-tenant-002",
        contactEmail: "contact2@test-tenant.com",
        ownerFirstName: "Jane",
        ownerLastName: "Doe",
        ownerEmail: email,
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("email");
    });

    it("should reject mismatched passwords", async () => {
      const res = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-pw-mismatch",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "DifferentPass456!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("Passwords do not match");
    });

    it("should reject weak password", async () => {
      const res = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-weak-pw",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "weak",
        ownerPasswordConfirm: "weak",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should validate required fields", async () => {
      const res = await request(app).post("/api/v1/tenants").send({
        name: "Test",
        // missing slug, contactEmail, owner info
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/tenants/:id (Get Tenant)", () => {
    beforeEach(async () => {
      // Register a tenant for use in tests
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-get",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      tenantId = tenantRes.body.data.tenant.id;
      storeAdminId = tenantRes.body.data.storeAdmin.id;

      // Get store admin token
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner@test-tenant.com",
        password: "SecurePass123!",
      });
      storeAdminToken = loginRes.body.data.accessToken;
    });

    it("should allow super admin to view any tenant", async () => {
      const res = await request(app)
        .get(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(tenantId);
      expect(res.body.data.name).toBe("Test Tenant Store");
    });

    it("should allow store admin to view own tenant", async () => {
      const res = await request(app)
        .get(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(tenantId);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get(`/api/v1/tenants/${tenantId}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent tenant", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/v1/tenants/${fakeId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/v1/tenants/:id (Update Tenant)", () => {
    beforeEach(async () => {
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-update",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      tenantId = tenantRes.body.data.tenant.id;

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner@test-tenant.com",
        password: "SecurePass123!",
      });
      storeAdminToken = loginRes.body.data.accessToken;
    });

    it("should allow super admin to update any tenant", async () => {
      const res = await request(app)
        .patch(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Updated Store Name",
          contactEmail: "new@store.com",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Store Name");
      expect(res.body.data.contactEmail).toBe("new@store.com");
    });

    it("should allow store admin to update own tenant", async () => {
      const res = await request(app)
        .patch(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "My Updated Store",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("My Updated Store");
    });

    it("should allow partial updates", async () => {
      const res = await request(app)
        .patch(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          contactPhone: "+1-555-1234",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contactPhone).toBe("+1-555-1234");
      // Name should remain unchanged
      expect(res.body.data.name).toBe("Test Tenant Store");
    });
  });

  describe("POST /api/v1/tenants/:id/suspend (Suspend Tenant)", () => {
    beforeEach(async () => {
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-suspend",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      tenantId = tenantRes.body.data.tenant.id;
    });

    it("should allow super admin to suspend tenant", async () => {
      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/suspend`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          reason: "Non-payment",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("suspended");

      // Verify tenant is suspended in DB
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      expect(tenant?.status).toBe("suspended");
    });

    it("should reject suspend on already suspended tenant", async () => {
      // First suspend
      await request(app)
        .post(`/api/v1/tenants/${tenantId}/suspend`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ reason: "First suspension" });

      // Try to suspend again
      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/suspend`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ reason: "Second suspension" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject store admin from suspending tenant", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner@test-tenant.com",
        password: "SecurePass123!",
      });

      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/suspend`)
        .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`)
        .send({ reason: "Unauthorized attempt" });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/tenants/:id/activate (Activate Tenant)", () => {
    beforeEach(async () => {
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-activate",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      tenantId = tenantRes.body.data.tenant.id;

      // Suspend the tenant
      await request(app)
        .post(`/api/v1/tenants/${tenantId}/suspend`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ reason: "Test suspension" });
    });

    it("should allow super admin to activate suspended tenant", async () => {
      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/activate`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("active");

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      expect(tenant?.status).toBe("active");
    });

    it("should reject activate on already active tenant", async () => {
      // First activate
      await request(app)
        .post(`/api/v1/tenants/${tenantId}/activate`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      // Try to activate again
      const res = await request(app)
        .post(`/api/v1/tenants/${tenantId}/activate`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/tenants (List Tenants)", () => {
    beforeEach(async () => {
      // Create multiple test tenants
      for (let i = 1; i <= 3; i++) {
        await request(app).post("/api/v1/tenants").send({
          name: `Test Tenant ${i}`,
          slug: `test-tenant-list-${i}`,
          contactEmail: `contact${i}@test-tenant.com`,
          ownerFirstName: "John",
          ownerLastName: "Doe",
          ownerEmail: `owner${i}@test-tenant.com`,
          ownerPassword: "SecurePass123!",
          ownerPasswordConfirm: "SecurePass123!",
        });
      }
    });

    it("should allow super admin to list all tenants", async () => {
      const res = await request(app)
        .get("/api/v1/tenants")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/v1/tenants?page=2&limit=10")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(10);
    });

    it("should filter by status", async () => {
      // Get first tenant and suspend it
      const allRes = await request(app)
        .get("/api/v1/tenants")
        .set("Authorization", `Bearer ${superAdminToken}`);

      const firstTenant = allRes.body.data[0];

      await request(app)
        .post(`/api/v1/tenants/${firstTenant.id}/suspend`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ reason: "Test" });

      // Filter by status=active
      const activeRes = await request(app)
        .get("/api/v1/tenants?status=active")
        .set("Authorization", `Bearer ${superAdminToken}`);

      const allActive = activeRes.body.data.every((t: any) => t.status === "active");
      expect(allActive).toBe(true);
    });

    it("should reject store admin from listing tenants", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner1@test-tenant.com",
        password: "SecurePass123!",
      });

      const res = await request(app)
        .get("/api/v1/tenants")
        .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/tenants/:id (Delete Tenant)", () => {
    beforeEach(async () => {
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-delete",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      tenantId = tenantRes.body.data.tenant.id;
    });

    it("should allow super admin to delete tenant", async () => {
      const res = await request(app)
        .delete(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      expect(tenant).toBeNull();
    });

    it("should reject store admin from deleting tenant", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner@test-tenant.com",
        password: "SecurePass123!",
      });

      const res = await request(app)
        .delete(`/api/v1/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/tenants/:slug/check-slug (Check Slug)", () => {
    it("should return available=true for new slug", async () => {
      const res = await request(app).get(
        "/api/v1/tenants/completely-new-slug/check-slug"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
    });

    it("should return available=false for existing slug", async () => {
      // Create tenant
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Test Tenant Store",
        slug: "test-tenant-existing",
        contactEmail: "contact@test-tenant.com",
        ownerFirstName: "John",
        ownerLastName: "Doe",
        ownerEmail: "owner@test-tenant.com",
        ownerPassword: "SecurePass123!",
        ownerPasswordConfirm: "SecurePass123!",
      });

      // Check slug
      const res = await request(app).get(
        "/api/v1/tenants/test-tenant-existing/check-slug"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(false);
    });
  });
});
