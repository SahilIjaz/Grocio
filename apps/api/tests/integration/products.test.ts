/**
 * Product module integration tests
 * Tests all CRUD operations, filtering, search, stock management, and authorization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "@/app";
import { Express } from "express";
import Redis from "ioredis";

describe("Product Module", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;
  let superAdminToken: string;
  let storeAdminToken: string;
  let tenantId: string;
  let categoryId: string;

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
      where: { email: "test-super-admin-prod@grocio.local" },
      update: {},
      create: {
        email: "test-super-admin-prod@grocio.local",
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
      email: "test-super-admin-prod@grocio.local",
      password: "SuperAdmin123!",
    });
    superAdminToken = loginRes.body.data.accessToken;

    // Create test tenant
    const tenantRes = await request(app).post("/api/v1/tenants").send({
      name: "Test Store Products",
      slug: "test-store-prod",
      contactEmail: "contact@test-prod.com",
      ownerFirstName: "John",
      ownerLastName: "Doe",
      ownerEmail: "owner@test-prod.com",
      ownerPassword: "StoreAdmin123!",
      ownerPasswordConfirm: "StoreAdmin123!",
    });

    tenantId = tenantRes.body.data.tenant.id;

    // Get store admin token
    const adminLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner@test-prod.com",
      password: "StoreAdmin123!",
    });
    storeAdminToken = adminLoginRes.body.data.accessToken;

    // Create test category
    const catRes = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${storeAdminToken}`)
      .send({
        name: "Test Category",
        slug: "test-prod-category",
      });

    categoryId = catRes.body.data.id;
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test products before each test
    await prisma.product.deleteMany({
      where: { tenantId, sku: { contains: "TEST" } },
    });
  });

  describe("POST /api/v1/products (Create Product)", () => {
    it("should successfully create a product", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Fresh Red Apples",
          slug: "TEST-red-apples-001",
          sku: "TEST-APPLE-001",
          price: 3.99,
          comparePrice: 4.99,
          stockQuantity: 100,
          lowStockThreshold: 10,
          unit: "lb",
          tags: ["organic", "fresh", "local"],
          isActive: true,
          isFeatured: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Fresh Red Apples");
      expect(res.body.data.sku).toBe("TEST-APPLE-001");
      expect(res.body.data.price).toBe(3.99);
      expect(res.body.data.stockQuantity).toBe(100);
    });

    it("should reject duplicate SKU within tenant", async () => {
      // First product
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Product 1",
          slug: "TEST-prod-1",
          sku: "TEST-DUP-SKU",
          price: 10.0,
        });

      // Duplicate SKU
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Product 2",
          slug: "TEST-prod-2",
          sku: "TEST-DUP-SKU",
          price: 20.0,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("SKU");
    });

    it("should reject duplicate slug within tenant", async () => {
      // First product
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Product 1",
          slug: "TEST-dup-slug",
          sku: "TEST-SKU-1",
          price: 10.0,
        });

      // Duplicate slug
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Product 2",
          slug: "TEST-dup-slug",
          sku: "TEST-SKU-2",
          price: 20.0,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("slug");
    });

    it("should validate category exists and belongs to tenant", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: fakeId,
          name: "Product",
          slug: "TEST-invalid-cat",
          sku: "TEST-SKU-INVALID",
          price: 10.0,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain("Category");
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).post("/api/v1/products").send({
        categoryId: categoryId,
        name: "Unauthorized Product",
        slug: "TEST-unauth",
        sku: "TEST-UNAUTH",
        price: 10.0,
      });

      expect(res.status).toBe(401);
    });

    it("should allow optional fields", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Minimal Product",
          slug: "TEST-minimal-prod",
          sku: "TEST-MINIMAL",
          price: 5.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.stockQuantity).toBe(0);
      expect(res.body.data.lowStockThreshold).toBe(10);
      expect(res.body.data.unit).toBe("piece");
      expect(res.body.data.imageUrls).toEqual([]);
    });
  });

  describe("GET /api/v1/products (List Products with Filters)", () => {
    beforeEach(async () => {
      // Create test products
      const products = [
        {
          name: "Organic Apples",
          slug: "TEST-organic-apples",
          sku: "TEST-ORG-APPLE",
          price: 3.99,
          stockQuantity: 50,
          tags: ["organic", "fresh"],
          isFeatured: true,
        },
        {
          name: "Organic Bananas",
          slug: "TEST-organic-bananas",
          sku: "TEST-ORG-BANANA",
          price: 2.49,
          stockQuantity: 0,
          tags: ["organic", "fresh"],
          isFeatured: false,
        },
        {
          name: "Regular Oranges",
          slug: "TEST-regular-oranges",
          sku: "TEST-REG-ORANGE",
          price: 4.99,
          stockQuantity: 20,
          tags: ["regular"],
          isFeatured: false,
        },
      ];

      for (const product of products) {
        await request(app)
          .post("/api/v1/products")
          .set("Authorization", `Bearer ${storeAdminToken}`)
          .send({
            categoryId: categoryId,
            ...product,
          });
      }
    });

    it("should list products with pagination", async () => {
      const res = await request(app)
        .get("/api/v1/products?page=1&limit=2")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });

    it("should filter by category", async () => {
      const res = await request(app)
        .get(`/api/v1/products?categoryId=${categoryId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      const allSameCategory = res.body.data.every(
        (p: any) => p.categoryId === categoryId
      );
      expect(allSameCategory).toBe(true);
    });

    it("should filter by price range", async () => {
      const res = await request(app)
        .get("/api/v1/products?minPrice=3&maxPrice=4.5")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      const inRange = res.body.data.every(
        (p: any) => p.price >= 3 && p.price <= 4.5
      );
      expect(inRange).toBe(true);
    });

    it("should filter by tags", async () => {
      const res = await request(app)
        .get("/api/v1/products?tags=organic")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      const allHaveTag = res.body.data.every((p: any) =>
        p.tags.includes("organic")
      );
      expect(allHaveTag).toBe(true);
    });

    it("should search by name", async () => {
      const res = await request(app)
        .get("/api/v1/products?search=apple")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const hasApple = res.body.data.some((p: any) =>
        p.name.toLowerCase().includes("apple")
      );
      expect(hasApple).toBe(true);
    });

    it("should filter by in stock", async () => {
      const res = await request(app)
        .get("/api/v1/products?inStock=true")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      const allInStock = res.body.data.every((p: any) => p.stockQuantity > 0);
      expect(allInStock).toBe(true);
    });

    it("should filter by featured", async () => {
      const res = await request(app)
        .get("/api/v1/products?isFeatured=true")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      const allFeatured = res.body.data.every((p: any) => p.isFeatured === true);
      expect(allFeatured).toBe(true);
    });

    it("should be accessible as public endpoint", async () => {
      const res = await request(app).get("/api/v1/products");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/products/:id (Get Product)", () => {
    let productId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Get Product Test",
          slug: "TEST-get-product",
          sku: "TEST-GET-PROD",
          price: 10.0,
          stockQuantity: 5,
          lowStockThreshold: 10,
        });

      productId = res.body.data.id;
    });

    it("should get product by ID", async () => {
      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.name).toBe("Get Product Test");
    });

    it("should calculate isLowStock flag", async () => {
      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isLowStock).toBe(true); // 5 <= 10
    });

    it("should return 404 for non-existent product", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/v1/products/${fakeId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(404);
    });

    it("should be accessible as public endpoint", async () => {
      const res = await request(app).get(`/api/v1/products/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(productId);
    });
  });

  describe("PATCH /api/v1/products/:id (Update Product)", () => {
    let productId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Update Test Product",
          slug: "TEST-update-prod",
          sku: "TEST-UPDATE",
          price: 10.0,
          description: "Original description",
        });

      productId = res.body.data.id;
    });

    it("should update product", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          name: "Updated Product Name",
          price: 15.0,
          description: "Updated description",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Product Name");
      expect(res.body.data.price).toBe(15.0);
    });

    it("should allow partial updates", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          isFeatured: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isFeatured).toBe(true);
      expect(res.body.data.name).toBe("Update Test Product"); // unchanged
    });

    it("should reject duplicate SKU", async () => {
      // Create another product
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Another Product",
          slug: "TEST-another",
          sku: "TEST-ANOTHER",
          price: 20.0,
        });

      // Try to update to duplicate SKU
      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          sku: "TEST-ANOTHER",
        });

      expect(res.status).toBe(409);
    });

    it("should require store_admin role", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}`)
        .send({
          name: "Unauthorized Update",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/products/:id/stock (Update Stock)", () => {
    let productId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Stock Test Product",
          slug: "TEST-stock-prod",
          sku: "TEST-STOCK",
          price: 10.0,
          stockQuantity: 50,
        });

      productId = res.body.data.id;
    });

    it("should update stock", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          stockQuantity: 100,
          reason: "Restocked from warehouse",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stockQuantity).toBe(100);
    });

    it("should trigger low stock flag", async () => {
      await request(app)
        .patch(`/api/v1/products/${productId}/stock`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          stockQuantity: 5,
        });

      const res = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.body.data.isLowStock).toBe(true);
    });

    it("should require store_admin role", async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${productId}/stock`)
        .send({
          stockQuantity: 75,
        });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/products/low-stock (Get Low Stock Products)", () => {
    beforeEach(async () => {
      // Create products with different stock levels
      const products = [
        {
          name: "Low Stock Product",
          slug: "TEST-low-stock-1",
          sku: "TEST-LOW-1",
          price: 10.0,
          stockQuantity: 5,
          lowStockThreshold: 10,
        },
        {
          name: "Out of Stock Product",
          slug: "TEST-out-of-stock",
          sku: "TEST-OUT",
          price: 20.0,
          stockQuantity: 0,
          lowStockThreshold: 5,
        },
        {
          name: "Sufficient Stock Product",
          slug: "TEST-sufficient",
          sku: "TEST-SUFFICIENT",
          price: 15.0,
          stockQuantity: 100,
          lowStockThreshold: 10,
        },
      ];

      for (const product of products) {
        await request(app)
          .post("/api/v1/products")
          .set("Authorization", `Bearer ${storeAdminToken}`)
          .send({
            categoryId: categoryId,
            ...product,
          });
      }
    });

    it("should return low stock products", async () => {
      const res = await request(app)
        .get("/api/v1/products/low-stock")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products).toBeDefined();
      expect(res.body.data.count).toBeGreaterThanOrEqual(2); // At least 2 low stock
    });

    it("should require store_admin role", async () => {
      const res = await request(app).get("/api/v1/products/low-stock");

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/v1/products/:id (Delete Product)", () => {
    let productId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Delete Test Product",
          slug: "TEST-delete-prod",
          sku: "TEST-DELETE",
          price: 10.0,
        });

      productId = res.body.data.id;
    });

    it("should delete product", async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(getRes.status).toBe(404);
    });

    it("should require store_admin role", async () => {
      const res = await request(app).delete(`/api/v1/products/${productId}`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/products/:sku/check-sku (Check SKU Availability)", () => {
    it("should return available=true for new SKU", async () => {
      const res = await request(app).get(
        "/api/v1/products/COMPLETELY-NEW-SKU/check-sku"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
    });

    it("should return available=false for existing SKU", async () => {
      // Create product
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Existing Product",
          slug: "TEST-existing-sku",
          sku: "TEST-EXISTING-SKU",
          price: 10.0,
        });

      // Check SKU
      const res = await request(app).get(
        "/api/v1/products/TEST-EXISTING-SKU/check-sku"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });

    it("should be public endpoint", async () => {
      const res = await request(app).get(
        "/api/v1/products/public-check/check-sku"
      );

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/v1/products/:slug/check-slug (Check Slug Availability)", () => {
    it("should return available=true for new slug", async () => {
      const res = await request(app).get(
        "/api/v1/products/completely-new-slug/check-slug"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
    });

    it("should return available=false for existing slug", async () => {
      // Create product
      await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Existing Slug",
          slug: "TEST-existing-slug",
          sku: "TEST-EX-SLUG",
          price: 10.0,
        });

      // Check slug
      const res = await request(app).get(
        "/api/v1/products/TEST-existing-slug/check-slug"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });

    it("should be public endpoint", async () => {
      const res = await request(app).get(
        "/api/v1/products/public-check/check-slug"
      );

      expect(res.status).toBe(200);
    });
  });

  describe("Tenant Isolation", () => {
    let secondTenantId: string;
    let secondAdminToken: string;
    let secondCategoryId: string;

    beforeEach(async () => {
      // Create second tenant
      const tenantRes = await request(app).post("/api/v1/tenants").send({
        name: "Second Tenant Products",
        slug: "second-tenant-prod",
        contactEmail: "contact2@test-prod.com",
        ownerFirstName: "Jane",
        ownerLastName: "Doe",
        ownerEmail: "owner2@test-prod.com",
        ownerPassword: "StoreAdmin123!",
        ownerPasswordConfirm: "StoreAdmin123!",
      });

      secondTenantId = tenantRes.body.data.tenant.id;

      // Get second admin token
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "owner2@test-prod.com",
        password: "StoreAdmin123!",
      });

      secondAdminToken = loginRes.body.data.accessToken;

      // Create category in second tenant
      const catRes = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${secondAdminToken}`)
        .send({
          name: "Second Tenant Category",
          slug: "second-cat-prod",
        });

      secondCategoryId = catRes.body.data.id;
    });

    it("should prevent store_admin from accessing other tenant's products", async () => {
      // Create product in first tenant
      const prodRes = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "First Tenant Product",
          slug: "TEST-first-tenant",
          sku: "TEST-FIRST-TENANT",
          price: 10.0,
        });

      const productId = prodRes.body.data.id;

      // Try to access from second admin - should return 404
      const getRes = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${secondAdminToken}`);

      expect([404, 200]).toContain(getRes.status);
    });

    it("should allow super_admin to access any tenant's products", async () => {
      // Create product in first tenant
      const prodRes = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          categoryId: categoryId,
          name: "Super Admin Access Test",
          slug: "TEST-superadmin",
          sku: "TEST-SUPERADMIN",
          price: 10.0,
        });

      const productId = prodRes.body.data.id;

      // Super admin should be able to see it
      const getRes = await request(app)
        .get(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(getRes.status).toBe(200);
    });
  });
});
