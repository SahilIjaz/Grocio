import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcrypt";
import https from "https";
import fs from "fs";
import path from "path";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://grocio-app-frontend.netlify.app",
    process.env.FRONTEND_URL || ""
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));

app.get("/api/v1/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.get("/api/v1/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = (req.query.role as string) || "";

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, tenantId: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/v1/analytics", async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalTenants = await prisma.tenant.count();
    const totalOrders = await prisma.order.count();
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      _count: true,
    });

    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, firstName: true, lastName: true } }, tenant: { select: { name: true } } },
    });

    res.json({
      totalUsers,
      totalTenants,
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      usersByRole,
      ordersByStatus,
      recentOrders,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password using bcrypt
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, tenantId: user.tenantId });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = "customer", storeName, storeSlug } = req.body;

    // If registering as store owner, create a tenant first
    let tenantId = null;
    if (role === "store_admin" && storeName && storeSlug) {
      const tenant = await prisma.tenant.create({
        data: {
          name: storeName,
          slug: storeSlug,
          status: "active",
          contactEmail: email,
          settings: JSON.stringify({
            taxRate: 0.08,
            currency: "USD",
            timezone: "America/Los_Angeles",
            deliveryFee: 5,
            orderPrefix: storeSlug.toUpperCase()
          })
        }
      });
      tenantId = tenant.id;
    }

    // Hash password using bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: role,
        tenantId: tenantId
      }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.get("/api/v1/tenants", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({ where: { status: "active" } });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/v1/tenants/:slug", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
    res.json(tenant || { error: "Not found" });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.put("/api/v1/tenants/:slug", async (req, res) => {
  try {
    const { name, logoUrl, address, contactEmail, contactPhone } = req.body;
    const tenant = await prisma.tenant.update({
      where: { slug: req.params.slug },
      data: {
        name: name || undefined,
        logoUrl: logoUrl || undefined,
        address: address || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      },
    });
    res.json(tenant);
  } catch (error) {
    console.error("Tenant update error:", error);
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

app.get("/api/v1/tenants/:slug/orders", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const orders = await prisma.order.findMany({
      where: { tenantId: tenant.id },
      include: { items: true, user: true },
      orderBy: { createdAt: "desc" },
    });

    // Calculate revenue based on order status
    const deliveredOrders = orders.filter((o: any) => o.status === "delivered");
    const pendingOrders = orders.filter((o: any) => o.status === "pending");
    const processingOrders = orders.filter((o: any) => o.status === "confirmed" || o.status === "shipped");
    const cancelledOrders = orders.filter((o: any) => o.status === "cancelled");

    const stats = {
      totalOrders: orders.length,
      deliveredOrders: deliveredOrders.length,
      pendingOrders: pendingOrders.length,
      processingOrders: processingOrders.length,
      cancelledOrders: cancelledOrders.length,
      // Only count delivered orders as revenue (industry standard)
      revenue: deliveredOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0),
      pendingOrdersValue: pendingOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0),
      processingOrdersValue: processingOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0),
      orders,
    };

    res.json(stats);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/api/v1/tenants/:tenantSlug/products", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.tenantSlug } });
    if (!tenant) return res.status(404).json({ error: "Not found" });
    const products = await prisma.product.findMany({ where: { tenantId: tenant.id, isActive: true }, include: { category: true } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/v1/tenants/:tenantSlug/categories", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.tenantSlug } });
    if (!tenant) return res.status(404).json({ error: "Not found" });
    const categories = await prisma.category.findMany({ where: { tenantId: tenant.id, isActive: true } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/v1/tenants/:tenantSlug/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.tenantSlug } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    let slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Check if category with this slug already exists
    const existing = await prisma.category.findFirst({
      where: { tenantId: tenant.id, slug },
    });

    if (existing) {
      // Add random suffix to make it unique
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const category = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name,
        slug,
        description: description || "",
        sortOrder: 1,
        isActive: true,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Category creation error:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/v1/categories/:categoryId", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const category = await prisma.category.update({
      where: { id: req.params.categoryId },
      data: {
        name,
        description: description || "",
      },
    });

    res.json(category);
  } catch (error) {
    console.error("Category update error:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/v1/categories/:categoryId", async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Count products in this category
    const productCount = await prisma.product.count({
      where: { categoryId },
    });

    console.log(`Deleting category ${categoryId} with ${productCount} products`);

    // Delete associated products first
    if (productCount > 0) {
      await prisma.product.deleteMany({
        where: { categoryId },
      });
    }

    // Then delete the category
    const deletedCategory = await prisma.category.delete({
      where: { id: categoryId },
    });

    res.json({ message: "Category deleted successfully", category: deletedCategory, deletedProducts: productCount });
  } catch (error) {
    console.error("Category deletion error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

app.post("/api/v1/tenants/:tenantSlug/products", async (req, res) => {
  try {
    const { name, description, price, stockQuantity, categoryId, imageUrls = [] } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: "Name, price, and category are required" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.tenantSlug } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    let slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Check if product with this slug already exists
    const existing = await prisma.product.findFirst({
      where: { tenantId: tenant.id, slug },
    });

    if (existing) {
      // Add random suffix to make it unique
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const sku = `${slug.toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId,
        name,
        slug,
        description: description || "",
        sku,
        price: price.toString(),
        stockQuantity: parseInt(stockQuantity) || 0,
        unit: "unit",
        isActive: true,
        imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : []),
        tags: "[]",
      },
      include: { category: true },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.get("/api/v1/products/:productId", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.put("/api/v1/products/:productId", async (req, res) => {
  try {
    const { name, description, price, stockQuantity, categoryId, imageUrls } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.productId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: price.toString() }),
        ...(stockQuantity !== undefined && { stockQuantity: parseInt(stockQuantity) }),
        ...(categoryId && { categoryId }),
        ...(imageUrls && { imageUrls: JSON.stringify(Array.isArray(imageUrls) ? imageUrls : []) }),
      },
      include: { category: true },
    });

    res.json(product);
  } catch (error) {
    console.error("Product update error:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/v1/products/:productId", async (req, res) => {
  try {
    const product = await prisma.product.delete({
      where: { id: req.params.productId },
    });

    res.json({ message: "Product deleted successfully", product });
  } catch (error) {
    console.error("Product deletion error:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.post("/api/v1/cart/add", async (req, res) => {
  try {
    const { userId, tenantId, productId, quantity } = req.body;
    let cart = await prisma.cart.findFirst({ where: { userId, tenantId } });
    if (!cart) cart = await prisma.cart.create({ data: { userId, tenantId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Not found" });
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, tenantId, productId, quantity, unitPrice: product.price },
      update: { quantity: { increment: quantity } }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/v1/cart/:cartId", async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { id: req.params.cartId }, include: { items: { include: { product: true } } } });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/v1/orders", async (req, res) => {
  try {
    const { userId, items, deliveryAddress, tenantSlug } = req.body;

    console.log("Order creation request:", { userId, itemsCount: items?.length, deliveryAddress, tenantSlug });

    if (!userId || !items || items.length === 0) {
      console.log("Missing required fields - userId:", userId, "items:", items);
      return res.status(400).json({ error: "Missing required fields: userId, items, deliveryAddress" });
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User found:", user.id, "role:", user.role);

    // Determine tenantId
    let tenantId = user.tenantId;

    // If user is a customer and no tenantId, try to get it from tenantSlug
    if (!tenantId && tenantSlug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    if (!tenantId) {
      return res.status(400).json({ error: "Unable to determine store for order. Please provide tenantSlug." });
    }

    // Calculate totals from items and get product SKUs
    let subtotal = 0;
    const productIds = items.map((item: any) => item.id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.id);
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.id,
        productName: item.name,
        productSku: (product as any)?.sku || "UNKNOWN",
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        totalPrice: itemTotal.toString(),
        tenantId,
      };
    });

    console.log("Order items prepared:", orderItems.length, "subtotal:", subtotal, "tenantId:", tenantId);

    const order = await prisma.order.create({
      data: {
        tenantId,
        userId,
        orderNumber: `ORD-${Date.now()}`,
        subtotal: subtotal.toString(),
        totalAmount: subtotal.toString(),
        deliveryAddress,
        items: { createMany: { data: orderItems } },
      },
      include: { items: true },
    });

    console.log("Order created successfully:", order.id);
    res.status(201).json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `Failed to create order: ${errorMessage}` });
  }
});

app.put("/api/v1/orders/:orderId", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: { status },
      include: { items: true, user: true, tenant: true },
    });

    res.json(order);
  } catch (error) {
    console.error("Order update error:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

app.delete("/api/v1/orders/:orderId", async (req, res) => {
  try {
    const order = await prisma.order.delete({
      where: { id: req.params.orderId },
    });

    res.json({ message: "Order deleted successfully", order });
  } catch (error) {
    console.error("Order deletion error:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

const start = async (): Promise<void> => {
  try {
    console.log("📋 Starting server...");
    console.log("🔧 NODE_ENV:", process.env.NODE_ENV);
    console.log("🔧 PORT:", process.env.PORT || 3001);
    console.log("🔧 DATABASE_URL:", process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING");
    console.log("🔧 REDIS_URL:", process.env.REDIS_URL ? "✅ SET" : "❌ MISSING");

    console.log("\n📡 Connecting to PostgreSQL...");
    await prisma.$connect();
    console.log("✅ PostgreSQL connected successfully!");

    console.log("\n🔴 Starting Express server...");

    // Try to load SSL certificates for HTTPS
    const certPath = "/home/ubuntu/Grocio/apps/api/certs/cert.pem";
    const keyPath = "/home/ubuntu/Grocio/apps/api/certs/key.pem";

    console.log("🔍 Checking certificates...");
    console.log("📄 Cert path:", certPath, "exists:", fs.existsSync(certPath));
    console.log("📄 Key path:", keyPath, "exists:", fs.existsSync(keyPath));

    const port = process.env.PORT || 3001;
    let server;

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      try {
        console.log("🔐 Loading SSL certificates...");
        // Use HTTPS if certificates exist
        const httpsOptions = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        };
        server = https.createServer(httpsOptions, app);
        server.listen(port, () => {
          console.log("✅ Express server listening on port", port, "(HTTPS)");
          console.log("\n🚀 API: https://localhost:" + port);
          console.log("📊 Health check: https://localhost:" + port + "/api/v1/health\n");
        });
      } catch (err) {
        console.error("❌ Error loading certificates:", err);
        // Fallback to HTTP
        server = app.listen(port, () => {
          console.log("✅ Express server listening on port", port, "(HTTP - certificate error)");
          console.log("\n🚀 API: http://localhost:" + port);
          console.log("📊 Health check: http://localhost:" + port + "/api/v1/health\n");
        });
      }
    } else {
      // Fallback to HTTP if certificates don't exist
      server = app.listen(port, () => {
        console.log("✅ Express server listening on port", port, "(HTTP)");
        console.log("\n🚀 API: http://localhost:" + port);
        console.log("📊 Health check: http://localhost:" + port + "/api/v1/health\n");
      });
    }
  } catch (error) {
    console.error("❌ ERROR during startup:", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

console.log("🎯 Server startup initiated...\n");
start();
