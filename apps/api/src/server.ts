import express from "express";
import cors from "cors";
import helmet from "helmet";
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
    if (!user || user.passwordHash !== Buffer.from(password).toString("base64")) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const user = await prisma.user.create({
      data: { email, firstName, lastName, passwordHash: Buffer.from(password).toString("base64"), role: "customer" }
    });
    res.status(201).json({ id: user.id, email });
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
    const { userId, tenantId, cartId, deliveryAddress } = req.body;
    const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: { items: { include: { product: true } } } });
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: "Empty cart" });
    let subtotal = 0;
    const items = cart.items.map((i) => { const t = i.quantity * Number(i.unitPrice); subtotal += t; return { productId: i.productId, productName: i.product.name, productSku: i.product.sku, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: t }; });
    const order = await prisma.order.create({
      data: { tenantId, userId, orderNumber: `ORD-${Date.now()}`, subtotal, totalAmount: subtotal, deliveryAddress, items: { createMany: { data: items.map((i) => ({ tenantId, ...i })) } } },
      include: { items: true }
    });
    await prisma.cartItem.deleteMany({ where: { cartId } });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

const start = async () => {
  try {
    await prisma.$connect();
    console.log("✅ DB connected");
    app.listen(3001, () => console.log("\n🚀 API: http://localhost:3001\n"));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
