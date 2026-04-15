import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

app.get("/api/v1/health", (req, res) => res.json({ status: "ok" }));

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

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
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
    const productMap = new Map(products.map(p => [p.id, p]));

    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.id);
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.id,
        productName: item.name,
        productSku: product?.sku || "UNKNOWN",
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

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("✅ DB connected");
    }
    app.listen(3001, () => {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("\n🚀 API: http://localhost:3001\n");
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
