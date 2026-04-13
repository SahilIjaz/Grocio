import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Express } from "express";
import { createApp } from "@/app";
import { hashPassword } from "@/utils";

describe("Cart Endpoints", () => {
  let app: Express;
  let prisma: PrismaClient;
  let redis: Redis;

  let superAdminToken: string;
  let storeAdminToken: string;
  let customerToken: string;
  let customer2Token: string;

  let tenantId: string;
  let customerId: string;
  let customer2Id: string;
  let productId: string;
  let product2Id: string;
  let tenant2Id: string;

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

    // Get super admin token
    let loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: superAdminEmail,
        password: superAdminPassword,
      });

    superAdminToken = loginRes.body.data.accessToken;

    // Create tenant 1
    const tenantRes = await request(app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: `Tenant ${Date.now()}`,
        slug: `tenant-${Date.now()}`,
        contactEmail: `contact-${Date.now()}@tenant.com`,
      });

    tenantId = tenantRes.body.data.id;

    // Get store admin token (created during tenant registration)
    const storeAdminUser = await prisma.user.findFirst({
      where: {
        tenantId,
        role: "store_admin",
      },
    });

    loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: storeAdminUser!.email,
        password: "Admin123!@#", // Default password from tenant creation
      });

    storeAdminToken = loginRes.body.data.accessToken;

    // Create customer user 1
    const customerEmail = `customer-${Date.now()}@test.com`;
    const customerPassword = "CustomerPass123!";
    const customerHash = await hashPassword(customerPassword);

    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        passwordHash: customerHash,
        firstName: "Customer",
        lastName: "One",
        role: "customer",
        tenantId,
      },
    });

    customerId = customerUser.id;

    loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: customerEmail,
        password: customerPassword,
      });

    customerToken = loginRes.body.data.accessToken;

    // Create customer user 2
    const customer2Email = `customer2-${Date.now()}@test.com`;
    const customer2Password = "CustomerPass123!";
    const customer2Hash = await hashPassword(customer2Password);

    const customer2User = await prisma.user.create({
      data: {
        email: customer2Email,
        passwordHash: customer2Hash,
        firstName: "Customer",
        lastName: "Two",
        role: "customer",
        tenantId,
      },
    });

    customer2Id = customer2User.id;

    loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: customer2Email,
        password: customer2Password,
      });

    customer2Token = loginRes.body.data.accessToken;

    // Create test product 1
    const productRes = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${storeAdminToken}`)
      .send({
        name: "Test Product",
        slug: `product-${Date.now()}`,
        sku: `TEST-SKU-${Date.now()}`,
        description: "A test product",
        price: 9.99,
        stockQuantity: 50,
        lowStockThreshold: 10,
      });

    productId = productRes.body.data.id;

    // Create test product 2
    const product2Res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${storeAdminToken}`)
      .send({
        name: "Test Product 2",
        slug: `product2-${Date.now()}`,
        sku: `TEST-SKU2-${Date.now()}`,
        description: "Another test product",
        price: 19.99,
        stockQuantity: 5,
        lowStockThreshold: 10,
      });

    product2Id = product2Res.body.data.id;

    // Create tenant 2 for isolation testing
    const tenant2Res = await request(app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: `Tenant2 ${Date.now()}`,
        slug: `tenant2-${Date.now()}`,
        contactEmail: `contact2-${Date.now()}@tenant.com`,
      });

    tenant2Id = tenant2Res.body.data.id;
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up carts for this tenant
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          tenantId,
        },
      },
    });

    await prisma.cart.deleteMany({
      where: {
        tenantId,
      },
    });
  });

  describe("GET /cart", () => {
    it("should return empty cart for new user", async () => {
      const res = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.itemCount).toBe(0);
      expect(res.body.data.total).toBe("0.00");
    });

    it("should return items after adding to cart", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      const res = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.items[0].unitPrice).toBe("9.99");
      expect(res.body.data.itemCount).toBe(1);
      expect(res.body.data.total).toBe("19.98");
    });

    it("should preserve price snapshot", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      const res = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.body.data.items[0].unitPrice).toBe("9.99");
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/v1/cart");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /cart/items", () => {
    it("should add item to cart successfully", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.items[0].productId).toBe(productId);
      expect(res.body.data.items[0].unitPrice).toBe("9.99");
      expect(res.body.data.items[0].subtotal).toBe("19.98");
    });

    it("should increment quantity if product already in cart", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(5);
    });

    it("should return 404 if product not found", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: "550e8400-e29b-41d4-a716-446655440000",
          quantity: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND_ERROR");
    });

    it("should return 422 if insufficient stock", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 10, // Product2 has only 5 in stock
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("UNPROCESSABLE_ERROR");
    });

    it("should return 422 if adding would exceed stock", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 3,
        });

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 3, // Total would be 6, stock is 5
        });

      expect(res.status).toBe(422);
    });

    it("should work for store_admin role", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          productId,
          quantity: 1,
        });

      expect(res.status).toBe(200);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .send({
          productId,
          quantity: 1,
        });

      expect(res.status).toBe(401);
    });

    it("should validate input", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: "invalid",
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PATCH /cart/items/:productId", () => {
    it("should update item quantity", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      const res = await request(app)
        .patch(`/api/v1/cart/items/${productId}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          quantity: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(5);
    });

    it("should return 404 if product not in cart", async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${productId}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          quantity: 1,
        });

      expect(res.status).toBe(404);
    });

    it("should return 422 if quantity exceeds stock", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 2,
        });

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product2Id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          quantity: 10, // Product2 has only 5 in stock
        });

      expect(res.status).toBe(422);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${productId}`)
        .send({
          quantity: 1,
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /cart/items/:productId", () => {
    it("should remove item from cart", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      const res = await request(app)
        .delete(`/api/v1/cart/items/${productId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.itemCount).toBe(0);
    });

    it("should return 404 if product not in cart", async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${productId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).delete(`/api/v1/cart/items/${productId}`);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /cart/merge", () => {
    it("should merge guest cart into authenticated cart", async () => {
      const guestId = "550e8400-e29b-41d4-a716-446655440001";

      // Simulate guest cart in Redis
      const guestCart = {
        tenantId,
        items: [
          {
            productId,
            quantity: 2,
            unitPrice: 9.99,
            productName: "Test Product",
            imageUrl: null,
          },
        ],
      };

      await redis.setex(
        `guest_cart:${tenantId}:${guestId}`,
        604800,
        JSON.stringify(guestCart)
      );

      const res = await request(app)
        .post("/api/v1/cart/merge")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          guestId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.items[0].productId).toBe(productId);

      // Verify guest cart was deleted from Redis
      const guestCartExists = await redis.get(`guest_cart:${tenantId}:${guestId}`);
      expect(guestCartExists).toBeNull();
    });

    it("should merge into existing cart (add quantities)", async () => {
      const guestId = "550e8400-e29b-41d4-a716-446655440002";

      // Add item to authenticated cart
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Simulate guest cart in Redis
      const guestCart = {
        tenantId,
        items: [
          {
            productId,
            quantity: 3,
            unitPrice: 9.99,
            productName: "Test Product",
            imageUrl: null,
          },
        ],
      };

      await redis.setex(
        `guest_cart:${tenantId}:${guestId}`,
        604800,
        JSON.stringify(guestCart)
      );

      const res = await request(app)
        .post("/api/v1/cart/merge")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          guestId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(5); // 2 + 3
    });

    it("should skip non-existent products gracefully", async () => {
      const guestId = "550e8400-e29b-41d4-a716-446655440003";

      const guestCart = {
        tenantId,
        items: [
          {
            productId: "550e8400-e29b-41d4-a716-446655440000", // Non-existent
            quantity: 1,
            unitPrice: 9.99,
            productName: "Deleted Product",
            imageUrl: null,
          },
        ],
      };

      await redis.setex(
        `guest_cart:${tenantId}:${guestId}`,
        604800,
        JSON.stringify(guestCart)
      );

      const res = await request(app)
        .post("/api/v1/cart/merge")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          guestId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });

    it("should handle empty/non-existent guest cart gracefully", async () => {
      const guestId = "550e8400-e29b-41d4-a716-446655440004";

      const res = await request(app)
        .post("/api/v1/cart/merge")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          guestId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/v1/cart/merge")
        .send({
          guestId: "550e8400-e29b-41d4-a716-446655440005",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /cart", () => {
    it("should clear all items from cart", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      const res = await request(app)
        .delete("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.itemCount).toBe(0);
      expect(res.body.data.total).toBe("0.00");
    });

    it("should handle clearing empty cart gracefully", async () => {
      const res = await request(app)
        .delete("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });

    it("should require authentication", async () => {
      const res = await request(app).delete("/api/v1/cart");

      expect(res.status).toBe(401);
    });
  });

  describe("Tenant Isolation", () => {
    it("customer can only access own tenant cart", async () => {
      // Try to access cart without header (should work for own tenant)
      const res1 = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res1.status).toBe(200);

      // Add item for customer 1
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      // Customer 2 should have empty cart
      const res2 = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customer2Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.items).toEqual([]);
    });

    it("store_admin sees own tenant cart", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      const res = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      // Store admin has their own empty cart
      expect(res.body.data.items).toEqual([]);
    });

    it("should prevent cross-tenant product access", async () => {
      // Create product in tenant 2
      const tenant2User = await prisma.user.findFirst({
        where: {
          tenantId: tenant2Id,
          role: "store_admin",
        },
      });

      const tenant2Token = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: tenant2User!.email,
          password: "Admin123!@#",
        })
        .then((res) => res.body.data.accessToken);

      const tenant2ProductRes = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${tenant2Token}`)
        .send({
          name: "Tenant2 Product",
          slug: `product-tenant2-${Date.now()}`,
          sku: `TENANT2-${Date.now()}`,
          price: 10.0,
          stockQuantity: 100,
        });

      const tenant2ProductId = tenant2ProductRes.body.data.id;

      // Customer from tenant 1 tries to add product from tenant 2
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: tenant2ProductId,
          quantity: 1,
        });

      // Should fail because product is not in tenant 1
      expect(res.status).toBe(404);
    });
  });

  describe("Stock Validation", () => {
    it("should allow adding exactly available stock", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id, // Has 5 in stock
          quantity: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(5);
    });

    it("should prevent updating to exceed stock", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 3,
        });

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product2Id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          quantity: 6, // Exceeds stock of 5
        });

      expect(res.status).toBe(422);
    });

    it("should allow re-adding after removal", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      await request(app)
        .delete(`/api/v1/cart/items/${productId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(5);
    });
  });

  describe("Price Snapshots", () => {
    it("should capture price at add time", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      expect(res.body.data.items[0].unitPrice).toBe("9.99");
    });

    it("should not change stored price if product price changes", async () => {
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      // Update product price
      await request(app)
        .patch(`/api/v1/products/${productId}`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({
          price: 19.99,
        });

      // Get cart again
      const res = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      // Price should still be original
      expect(res.body.data.items[0].unitPrice).toBe("9.99");
    });

    it("should preserve guest item prices on merge", async () => {
      const guestId = "550e8400-e29b-41d4-a716-446655440006";

      // Simulate guest cart with custom price
      const guestCart = {
        tenantId,
        items: [
          {
            productId,
            quantity: 2,
            unitPrice: 8.99, // Different price
            productName: "Test Product",
            imageUrl: null,
          },
        ],
      };

      await redis.setex(
        `guest_cart:${tenantId}:${guestId}`,
        604800,
        JSON.stringify(guestCart)
      );

      const res = await request(app)
        .post("/api/v1/cart/merge")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          guestId,
        });

      expect(res.body.data.items[0].unitPrice).toBe("8.99");
    });
  });
});
