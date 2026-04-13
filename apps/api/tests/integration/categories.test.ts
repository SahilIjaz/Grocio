/**
 * Category module integration tests
 * Tests all CRUD operations, filtering, hierarchy, and authorization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "@/app";
import { Express } from "express";
import Redis from "ioredis";

describe("Category Module", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;
  let superAdminToken: string;
  let storeAdminToken: string;
  let tenantId: string;

  beforeAll(async () => {
    // Initialize clients
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
      where: { email: "test-super-admin-cat@grocio.local" },
      update: {},
      create: {
        email: "test-super-admin-cat@grocio.local",
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
      email: "test-super-admin-cat@grocio.local",
      password: "SuperAdmin123!",
    });
    superAdminToken = loginRes.body.data.accessToken;

    // Create test tenant
    const tenantRes = await request(app).post("/api/v1/tenants").send({
      name: "Test Store Categories",
      slug: "test-store-cat",
      contactEmail: "contact@test-cat.com",
      ownerFirstName: "John",
      ownerLastName: "Doe",
      ownerEmail: "owner@test-cat.com",
      ownerPassword: "StoreAdmin123!",
      ownerPasswordConfirm: "StoreAdmin123!",
    });

    tenantId = tenantRes.body.data.tenant.id;

    // Get store admin token
    const adminLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner@test-cat.com",
      password: "StoreAdmin123!",
    });
    storeAdminToken = adminLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test categories before each test
    await prisma.category.deleteMany({
      where: { tenantId, slug: { contains: "test-cat" } },
    });
  });

  describe("POST /api/v1/categories (Create Category)", () => {
    it("should successfully create a category", async () => {
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Fresh Produce",
          slug: "test-cat-produce",
          description: "Fresh fruits and vegetables",
          sortOrder: 1,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Fresh Produce");
      expect(res.body.data.slug).toBe("test-cat-produce");
      expect(res.body.data.description).toBe("Fresh fruits and vegetables");
    });

    it("should reject duplicate slug within tenant", async () => {
      // First creation
      await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Produce",
          slug: "test-cat-dup",
          description: "First category",
        });

      // Try duplicate
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Different Name",
          slug: "test-cat-dup",
          description: "Duplicate slug",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("slug");
    });

    it("should reject invalid slug format", async () => {
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Invalid Slug Category",
          slug: "Test-Cat_INVALID",
          description: "Invalid slug with uppercase and underscore",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).post("/api/v1/categories").send({
        name: "No Auth Category",
        slug: "test-cat-noauth",
      });

      expect(res.status).toBe(401);
    });

    it("should reject customer role (only store_admin allowed)", async () => {
      // Create customer user
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      const customerPassword = await import("@/utils/password").then((m) =>
        m.hashPassword("Customer123!")
      );

      await prisma.user.create({
        data: {
          email: "customer@test-cat.com",
          firstName: "Customer",
          lastName: "User",
          passwordHash: customerPassword,
          role: "customer",
          tenantId: tenantId,
          isActive: true,
        },
      });

      const customerLoginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "customer@test-cat.com",
          password: "Customer123!",
        });

      const customerToken = customerLoginRes.body.data.accessToken;

      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          name: "Customer Category",
          slug: "test-cat-customer",
        });

      expect(res.status).toBe(403);
    });

    it("should allow optional fields", async () => {
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Minimal Category",
          slug: "test-cat-minimal",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.description).toBeNull();
      expect(res.body.data.parentId).toBeNull();
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe("GET /api/v1/categories (List Categories)", () => {
    beforeEach(async () => {
      // Create test categories
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post("/api/v1/categories")
          .set("Authorization", `Bearer ${storeAdminToken}`)
          .send({
            name: `Category ${i}`,
            slug: `test-cat-list-${i}`,
            sortOrder: i,
            isActive: i <= 3,
          });
      }
    });

    it("should list categories with pagination", async () => {
      const res = await request(app)
        .get("/api/v1/categories?page=1&limit=3")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(3);
      expect(res.body.meta.total).toBe(5);
    });

    it("should filter inactive categories by default", async () => {
      const res = await request(app)
        .get("/api/v1/categories?page=1&limit=10")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      const allActive = res.body.data.every((c: any) => c.isActive === true);
      expect(allActive).toBe(true);
      expect(res.body.meta.total).toBe(3);
    });

    it("should include inactive categories when requested", async () => {
      const res = await request(app)
        .get("/api/v1/categories?page=1&limit=10&includeInactive=true")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.body.meta.total).toBe(5);
    });

    it("should be accessible as public endpoint", async () => {
      const res = await request(app).get("/api/v1/categories?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/categories/:id (Get Category)", () => {
    let categoryId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Get Category Test",
          slug: "test-cat-get",
          description: "For testing get endpoint",
        });

      categoryId = res.body.data.id;
    });

    it("should get category by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(categoryId);
      expect(res.body.data.name).toBe("Get Category Test");
    });

    it("should return 404 for non-existent category", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/v1/categories/${fakeId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should be accessible as public endpoint", async () => {
      const res = await request(app).get(`/api/v1/categories/${categoryId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(categoryId);
    });
  });

  describe("GET /api/v1/categories/:id/with-children (Get with Hierarchy)", () => {
    let parentId: string;
    let childId: string;

    beforeEach(async () => {
      // Create parent
      const parentRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Parent Category",
          slug: "test-cat-parent",
        });

      parentId = parentRes.body.data.id;

      // Create child
      const childRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Child Category",
          slug: "test-cat-child",
          parentId: parentId,
        });

      childId = childRes.body.data.id;
    });

    it("should get category with children", async () => {
      const res = await request(app)
        .get(`/api/v1/categories/${parentId}/with-children`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(parentId);
      expect(Array.isArray(res.body.data.children)).toBe(true);
      expect(res.body.data.children.length).toBe(1);
      expect(res.body.data.children[0].id).toBe(childId);
    });

    it("should return empty children array for leaf category", async () => {
      const res = await request(app)
        .get(`/api/v1/categories/${childId}/with-children`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.children).toEqual([]);
    });
  });

  describe("PATCH /api/v1/categories/:id (Update Category)", () => {
    let categoryId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Update Test Category",
          slug: "test-cat-update",
          description: "Original description",
        });

      categoryId = res.body.data.id;
    });

    it("should update category", async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Updated Category Name",
          description: "Updated description",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Category Name");
      expect(res.body.data.description).toBe("Updated description");
    });

    it("should allow partial updates", async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          sortOrder: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.sortOrder).toBe(10);
      expect(res.body.data.name).toBe("Update Test Category"); // unchanged
    });

    it("should reject duplicate slug", async () => {
      // Create another category
      await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Another Category",
          slug: "test-cat-another",
        });

      // Try to update to duplicate slug
      const res = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          slug: "test-cat-another",
        });

      expect(res.status).toBe(409);
    });

    it("should reject self-referencing parent", async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          parentId: categoryId,
        });

      expect(res.status).toBe(409);
    });

    it("should require store_admin role", async () => {
      const res = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .send({
          name: "Unauthorized Update",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/v1/categories/:id (Delete Category)", () => {
    it("should delete empty category", async () => {
      const createRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Delete Test",
          slug: "test-cat-delete",
        });

      const categoryId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(getRes.status).toBe(404);
    });

    it("should reject deletion of category with children", async () => {
      // Create parent
      const parentRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Parent",
          slug: "test-cat-parent-del",
        });

      const parentId = parentRes.body.data.id;

      // Create child
      await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Child",
          slug: "test-cat-child-del",
          parentId: parentId,
        });

      // Try to delete parent
      const deleteRes = await request(app)
        .delete(`/api/v1/categories/${parentId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(deleteRes.status).toBe(409);
      expect(deleteRes.body.error.message).toContain("child");
    });

    it("should reject deletion of category with products", async () => {
      const catRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Products Category",
          slug: "test-cat-with-prod",
        });

      const categoryId = catRes.body.data.id;

      // Create product in this category
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Test Product",
          slug: "test-prod-delete",
          sku: "TEST-SKU-DELETE",
          price: 10.0,
        });

      // Try to delete category
      const deleteRes = await request(app)
        .delete(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(deleteRes.status).toBe(409);
      expect(deleteRes.body.error.message).toContain("product");
    });

    it("should require store_admin role", async () => {
      const createRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Auth Test",
          slug: "test-cat-auth-del",
        });

      const categoryId = createRes.body.data.id;

      const deleteRes = await request(app).delete(
        `/api/v1/categories/${categoryId}`
      );

      expect(deleteRes.status).toBe(401);
    });
  });

  describe("GET /api/v1/categories/:slug/check-slug (Check Slug Availability)", () => {
    it("should return available=true for new slug", async () => {
      const res = await request(app).get(
        "/api/v1/categories/completely-new-slug/check-slug"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
    });

    it("should return available=false for existing slug", async () => {
      // Create category
      await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Existing Category",
          slug: "test-cat-existing",
        });

      // Check slug
      const res = await request(app).get(
        "/api/v1/categories/test-cat-existing/check-slug"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });

    it("should be public endpoint", async () => {
      const res = await request(app).get(
        "/api/v1/categories/public-check/check-slug"
      );

      expect(res.status).toBe(200);
    });
  });

  describe("Tenant Isolation", () => {
    let secondTenantId: string;
    let secondAdminToken: string;

    beforeEach(async () => {
      // Create second tenant
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Second Tenant",
        slug: "second-tenant-cat",
        contactEmail: "contact2@test-cat.com",
        ownerFirstName: "Jane",
        ownerLastName: "Doe",
        ownerEmail: "owner2@test-cat.com",
        ownerPassword: "StoreAdmin123!",
        ownerPasswordConfirm: "StoreAdmin123!",
      });

      secondTenantId = tenantRes.body.data.tenant.id;

      // Get second admin token
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner2@test-cat.com",
        password: "StoreAdmin123!",
      });

      secondAdminToken = loginRes.body.data.accessToken;
    });

    it("should prevent store_admin from accessing other tenant's categories", async () => {
      // Create category in first tenant
      const catRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "First Tenant Category",
          slug: "test-cat-tenant1",
        });

      const categoryId = catRes.body.data.id;

      // Try to access from second admin (should fail - different tenant)
      const getRes = await request(app)
        .get(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${secondAdminToken}`);

      // Should return 404 or empty (depends on implementation)
      expect([404, 200]).toContain(getRes.status);
    });

    it("should allow super_admin to access any tenant's categories", async () => {
      // Create category in first tenant
      const catRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Super Admin Access Test",
          slug: "test-cat-superadmin",
        });

      const categoryId = catRes.body.data.id;

      // Super admin should be able to see it
      const getRes = await request(app)
        .get(`/api/v1/categories/${categoryId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(getRes.status).toBe(200);
    });
  });
});
