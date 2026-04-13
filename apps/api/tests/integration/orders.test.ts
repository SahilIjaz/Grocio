import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Express } from "express";
import { createApp } from "@/app";
import { hashPassword } from "@/utils";

describe("Order Endpoints", () => {
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

    let loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: superAdminEmail,
        password: superAdminPassword,
      });

    superAdminToken = loginRes.body.data.accessToken;

    // Create tenant
    const tenantRes = await request(app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: `Tenant ${Date.now()}`,
        slug: `tenant-${Date.now()}`,
        contactEmail: `contact-${Date.now()}@tenant.com`,
      });

    tenantId = tenantRes.body.data.id;

    // Get store admin token
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
        password: "Admin123!@#",
      });

    storeAdminToken = loginRes.body.data.accessToken;

    // Create customer 1
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

    // Create customer 2
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

    // Create product 1 with enough stock
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

    // Create product 2 with limited stock
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
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up orders, carts for this tenant
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          tenantId,
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        tenantId,
      },
    });

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

  describe("POST /orders", () => {
    it("should create order from cart successfully", async () => {
      // Add items to cart
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Create order
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main Street",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
          notes: "Leave at door",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.subtotal).toBe("19.98");
      expect(res.body.data.totalAmount).toBeDefined();
    });

    it("should return 422 if cart is empty", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main Street",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      expect(res.status).toBe(422);
    });

    it("should return 422 if insufficient stock", async () => {
      // Add too many items
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main Street",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      // This should fail because cart is empty, not stock issue
      // First add items to cart
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId: product2Id,
          quantity: 10, // More than stock of 5
        });

      const res2 = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main Street",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      expect(res2.status).toBe(422);
    });

    it("should clear cart after creating order", async () => {
      // Add items
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      // Create order
      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main Street",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      // Check cart is empty
      const cartRes = await request(app)
        .get("/api/v1/cart")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(cartRes.body.data.items).toEqual([]);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .send({
          deliveryAddress: {
            line1: "123 Main Street",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      expect(res.status).toBe(401);
    });

    it("should validate delivery address", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "1", // Too short
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /orders", () => {
    it("customer should see only own orders", async () => {
      // Create order for customer 1
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      // Create order for customer 2
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({ productId, quantity: 1 });

      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({
          deliveryAddress: {
            line1: "456 Oak",
            city: "Shelbyville",
            state: "Illinois",
            zipCode: "62702",
          },
        });

      // Customer 1 lists orders
      const res = await request(app)
        .get("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("store_admin should see all orders in tenant", async () => {
      // Create orders for both customers
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({ productId, quantity: 1 });

      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({
          deliveryAddress: {
            line1: "456 Oak",
            city: "Shelbyville",
            state: "Illinois",
            zipCode: "62702",
          },
        });

      // Admin lists all orders
      const res = await request(app)
        .get("/api/v1/orders")
        .set("Authorization", `Bearer ${storeAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/v1/orders?page=1&limit=10")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });
  });

  describe("GET /orders/:id", () => {
    it("customer should get own order", async () => {
      // Create order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Get order
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderId);
    });

    it("customer should not get other customer's order", async () => {
      // Create order for customer 1
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Customer 2 tries to get it
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set("Authorization", `Bearer ${customer2Token}`);

      expect(res.status).toBe(404);
    });

    it("should return 404 for non-existent order", async () => {
      const res = await request(app)
        .get("/api/v1/orders/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /orders/:id/cancel", () => {
    it("customer should cancel own pending order", async () => {
      // Create order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 2 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Cancel order
      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ reason: "Changed my mind" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("cancelled");
      expect(res.body.data.cancelledReason).toBe("Changed my mind");
    });

    it("should restore stock on cancel", async () => {
      // Check initial stock
      const initialProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      const initialStock = initialProduct!.stockQuantity;

      // Create order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 3 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Stock should be decremented
      let product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product!.stockQuantity).toBe(initialStock - 3);

      // Cancel order
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`);

      // Stock should be restored
      product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product!.stockQuantity).toBe(initialStock);
    });

    it("customer cannot cancel confirmed order", async () => {
      // Create and confirm order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Confirm order (admin)
      await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({ status: "confirmed" });

      // Customer tries to cancel
      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(422);
    });
  });

  describe("PATCH /orders/:id/status", () => {
    it("admin should transition pending to confirmed", async () => {
      // Create order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Transition to confirmed
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({ status: "confirmed" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("confirmed");
      expect(res.body.data.confirmedAt).toBeDefined();
    });

    it("should enforce state machine", async () => {
      // Create order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Try invalid transition (pending -> shipped)
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${storeAdminToken}`)
        .send({ status: "shipped" });

      expect(res.status).toBe(422);
    });

    it("customer cannot update status", async () => {
      // Create order
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const createRes = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      const orderId = createRes.body.data.id;

      // Customer tries to update status
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "confirmed" });

      expect(res.status).toBe(403);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .patch("/api/v1/orders/550e8400-e29b-41d4-a716-446655440000/status")
        .send({ status: "confirmed" });

      expect(res.status).toBe(401);
    });
  });

  describe("Stock Decrement", () => {
    it("should decrement stock atomically on order creation", async () => {
      const initialProduct = await prisma.product.findUnique({
        where: { id: product2Id },
      });
      const initialStock = initialProduct!.stockQuantity;

      // Add items to cart
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: product2Id, quantity: 2 });

      // Create order
      await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      // Verify stock decremented
      const product = await prisma.product.findUnique({
        where: { id: product2Id },
      });

      expect(product!.stockQuantity).toBe(initialStock - 2);
    });

    it("should prevent overselling", async () => {
      // Product 2 has 5 items, try to order 6
      await request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: product2Id, quantity: 6 });

      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          deliveryAddress: {
            line1: "123 Main",
            city: "Springfield",
            state: "Illinois",
            zipCode: "62701",
          },
        });

      expect(res.status).toBe(422);
    });
  });
});
