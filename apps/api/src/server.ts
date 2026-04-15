import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

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
    const { userId, items, deliveryAddress } = req.body;

    if (!userId || !items || items.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user to find their tenant
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate totals from items
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        totalPrice: itemTotal.toString(),
      };
    });

    const order = await prisma.order.create({
      data: {
        tenantId: user.tenantId || "",
        userId,
        orderNumber: `ORD-${Date.now()}`,
        subtotal: subtotal.toString(),
        totalAmount: subtotal.toString(),
        deliveryAddress,
        items: { createMany: { data: orderItems } },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
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
