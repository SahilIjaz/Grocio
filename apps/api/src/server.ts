import express from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import * as path from "path";
import { fileURLToPath } from "url";

// Types
interface AuthRequest extends express.Request {
  user?: { id: string; email: string; role: string; tenantId: string | null };
  tenantId?: string | null;
}

// Initialize Prisma and Redis
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || "redis-18148.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  port: parseInt(process.env.REDIS_PORT || "18148"),
  password: process.env.REDIS_PASSWORD || "SahilIjaz*$1",
});

const app = express();
const PORT = parseInt(process.env.API_PORT || "3001");

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001").split(","),
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Auth Middleware
app.use(async (req: AuthRequest, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    // In production, verify JWT here
    // For now, just pass through for testing
    req.user = { id: "test", email: "test@test.com", role: "admin", tenantId: null };
  } catch (err) {
    console.error("Auth error:", err);
  }
  next();
});

// Health Check
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// ==================== AUTH ROUTES ====================
app.post("/api/v1/auth/register", async (req: AuthRequest, res) => {
  try {
    const { email, password, firstName, lastName, tenantSlug } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let tenantId: string | null = null;

    // If registering with a store, find or create tenant
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });

      if (!tenant) {
        return res.status(404).json({ error: "Store not found" });
      }

      tenantId = tenant.id;
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Hash password (in production, use bcrypt)
    const hashedPassword = Buffer.from(password).toString("base64");

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash: hashedPassword,
        tenantId,
        role: "customer",
        isActive: true,
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/v1/auth/login", async (req: AuthRequest, res) => {
  try {
    const { email, password, tenantSlug } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    let query: any = { email };
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });
      if (tenant) {
        query.tenantId = tenant.id;
      }
    }

    const user = await prisma.user.findFirst({
      where: query,
    });

    if (!user || user.passwordHash !== Buffer.from(password).toString("base64")) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "User account is disabled" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ==================== TENANT ROUTES ====================
app.get("/api/v1/tenants", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        contactEmail: true,
      },
    });
    res.json(tenants);
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

app.get("/api/v1/tenants/:slug", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        contactEmail: true,
        status: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (error) {
    console.error("Get tenant error:", error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

// ==================== PRODUCT ROUTES ====================
app.get("/api/v1/tenants/:tenantSlug/products", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.tenantSlug },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const products = await prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/v1/tenants/:tenantSlug/products/:id", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.tenantSlug },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });

    if (!product || product.tenantId !== tenant.id) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// ==================== CATEGORY ROUTES ====================
app.get("/api/v1/tenants/:tenantSlug/categories", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.tenantSlug },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const categories = await prisma.category.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ==================== CART ROUTES ====================
app.post("/api/v1/cart/add", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { tenantId, productId, quantity } = req.body;

    if (!tenantId || !productId || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get or create cart
    let cart = await prisma.cart.findFirst({
      where: { userId: req.user.id, tenantId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: req.user.id,
          tenantId,
        },
      });
    }

    // Add or update item
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      create: {
        cartId: cart.id,
        tenantId,
        productId,
        quantity,
        unitPrice: product.price,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    res.json({ success: true, cartId: cart.id });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

app.get("/api/v1/cart/:cartId", async (req: AuthRequest, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { id: req.params.cartId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    res.json(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// ==================== ORDER ROUTES ====================
app.post("/api/v1/orders", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { tenantId, cartId, deliveryAddress } = req.body;

    if (!tenantId || !cartId || !deliveryAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const itemTotal = item.quantity * Number(item.unitPrice);
      subtotal += itemTotal;
      return {
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        tenantId,
        userId: req.user.id,
        orderNumber: `ORD-${Date.now()}`,
        subtotal,
        totalAmount: subtotal,
        deliveryAddress,
        items: {
          createMany: {
            data: orderItems.map((item) => ({
              tenantId,
              ...item,
            })),
          },
        },
      },
      include: { items: true },
    });

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.get("/api/v1/orders/:orderId", async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");

    await redis.ping();
    console.log("✅ Redis connected");

    app.listen(PORT, () => {
      console.log(`\n🚀 Grocio API Server running on http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/v1/health\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

startServer();
