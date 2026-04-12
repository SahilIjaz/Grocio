/**
 * Prisma client instance
 * Singleton pattern to ensure only one connection pool
 */

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

/**
 * Get or create Prisma client instance
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("SIGINT received, closing database connection...");
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, closing database connection...");
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  return prisma;
};

/**
 * Disconnect from database
 * Should be called when gracefully shutting down the application
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null as any;
  }
};

/**
 * Check database connection
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

export default getPrismaClient;
