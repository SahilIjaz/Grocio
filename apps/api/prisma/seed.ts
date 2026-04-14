/**
 * Prisma seed script
 * Seeds initial data for development
 * Run with: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Seeding database...\n");

  try {
    // 1. Create Super Admin User
    console.log("👤 Creating super admin user...");
    const superAdminEmail = "admin@grocio.local";
    const superAdminPassword = await bcrypt.hash("SuperAdmin123!", 12);

    const superAdmin = await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {}, // Don't update if already exists
      create: {
        email: superAdminEmail,
        firstName: "Super",
        lastName: "Admin",
        passwordHash: superAdminPassword,
        role: "super_admin",
        tenantId: null, // No tenant for super admin
        isActive: true,
      },
    });

    console.log(`   ✅ Super admin created: ${superAdmin.email}`);

    // 2. Create Demo Tenant
    console.log("\n🏪 Creating demo tenant...");
    const tenant = await prisma.tenant.upsert({
      where: { slug: "demo-grocery" },
      update: {}, // Don't update if already exists
      create: {
        name: "Demo Grocery Store",
        slug: "demo-grocery",
        contactEmail: "demo@grocio.local",
        contactPhone: "+1-234-567-8900",
        address: "123 Main St, San Francisco, CA 94102",
        status: "active",
        settings: {
          currency: "USD",
          timezone: "America/Los_Angeles",
          taxRate: 0.08,
          deliveryFee: 5.0,
          orderPrefix: "DMG",
        },
      },
    });

    console.log(`   ✅ Tenant created: ${tenant.name}`);

    // 3. Create Store Admin User
    console.log("\n👔 Creating store admin user...");
    const storeAdminEmail = "owner@democore.local";
    const storeAdminPassword = await bcrypt.hash("StoreAdmin123!", 12);

    const storeAdmin = await prisma.user.upsert({
      where: {
        email_tenantId: {
          email: storeAdminEmail,
          tenantId: tenant.id,
        },
      },
      update: {}, // Don't update if already exists
      create: {
        email: storeAdminEmail,
        firstName: "Store",
        lastName: "Owner",
        passwordHash: storeAdminPassword,
        role: "store_admin",
        tenantId: tenant.id,
        isActive: true,
      },
    });

    console.log(`   ✅ Store admin created: ${storeAdmin.email}`);

    // 4. Create Demo Customer
    console.log("\n🛒 Creating demo customer user...");
    const customerEmail = "customer@example.local";
    const customerPassword = await bcrypt.hash("Customer123!", 12);

    const customer = await prisma.user.upsert({
      where: {
        email_tenantId: {
          email: customerEmail,
          tenantId: tenant.id,
        },
      },
      update: {}, // Don't update if already exists
      create: {
        email: customerEmail,
        firstName: "John",
        lastName: "Customer",
        passwordHash: customerPassword,
        role: "customer",
        tenantId: tenant.id,
        isActive: true,
      },
    });

    console.log(`   ✅ Customer created: ${customer.email}`);

    // 5. Create Demo Categories
    console.log("\n📂 Creating product categories...");
    const categories = await Promise.all([
      prisma.category.upsert({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: "produce",
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          name: "Produce",
          slug: "produce",
          description: "Fresh fruits and vegetables",
          sortOrder: 1,
          isActive: true,
        },
      }),
      prisma.category.upsert({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: "dairy",
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          name: "Dairy",
          slug: "dairy",
          description: "Milk, cheese, and dairy products",
          sortOrder: 2,
          isActive: true,
        },
      }),
      prisma.category.upsert({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: "meat-poultry",
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          name: "Meat & Poultry",
          slug: "meat-poultry",
          description: "Fresh meat and poultry",
          sortOrder: 3,
          isActive: true,
        },
      }),
    ]);

    console.log(`   ✅ Created ${categories.length} categories`);

    // 6. Create Demo Products
    console.log("\n🍎 Creating demo products...");
    const products = await Promise.all([
      prisma.product.upsert({
        where: {
          tenantId_sku: {
            tenantId: tenant.id,
            sku: "APPLE-RED-001",
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          categoryId: categories[0].id,
          name: "Red Apples",
          slug: "red-apples",
          description: "Fresh, crisp red apples grown locally",
          sku: "APPLE-RED-001",
          price: 3.99,
          stockQuantity: 50,
          unit: "lb",
          isActive: true,
          isFeatured: true,
          tags: ["organic", "fresh", "local"],
        },
      }),
      prisma.product.upsert({
        where: {
          tenantId_sku: {
            tenantId: tenant.id,
            sku: "MILK-WHOLE-001",
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          categoryId: categories[1].id,
          name: "Whole Milk",
          slug: "whole-milk",
          description: "Fresh whole milk, 1 gallon",
          sku: "MILK-WHOLE-001",
          price: 4.49,
          stockQuantity: 30,
          unit: "gallon",
          isActive: true,
          isFeatured: true,
          tags: ["dairy", "fresh"],
        },
      }),
      prisma.product.upsert({
        where: {
          tenantId_sku: {
            tenantId: tenant.id,
            sku: "CHICKEN-BREAST-001",
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          categoryId: categories[2].id,
          name: "Chicken Breast",
          slug: "chicken-breast",
          description: "Fresh boneless, skinless chicken breast",
          sku: "CHICKEN-BREAST-001",
          price: 8.99,
          stockQuantity: 25,
          unit: "lb",
          isActive: true,
          tags: ["fresh", "meat"],
        },
      }),
    ]);

    console.log(`   ✅ Created ${products.length} products`);

    console.log("\n✨ Seeding complete!\n");
    console.log("📝 Demo Account Credentials:");
    console.log(`   Super Admin:  ${superAdminEmail} / SuperAdmin123!`);
    console.log(`   Store Owner:  ${storeAdminEmail} / StoreAdmin123!`);
    console.log(`   Customer:     ${customerEmail} / Customer123!`);
    console.log("\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
