/**
 * Server entry point
 * Initializes database and Redis, creates Express app, and starts HTTP server
 */

import http from "http";
import { getPrismaClient, checkDatabaseConnection } from "@/config/database";
import { getRedisClient, checkRedisConnection } from "@/config/redis";
import { getConfig } from "@/config";
import { createApp } from "@/app";

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    // Load configuration
    const config = getConfig();
    console.log(`🚀 Starting Grocio API in ${config.NODE_ENV} mode...`);

    // Connect to database
    console.log("\n📦 Connecting to database...");
    const prisma = getPrismaClient();
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }

    // Connect to Redis
    console.log("\n🗂️  Connecting to Redis...");
    const redis = getRedisClient();
    const redisConnected = await checkRedisConnection();
    if (!redisConnected) {
      throw new Error("Failed to connect to Redis");
    }

    // Create Express app
    console.log("\n⚙️  Creating Express application...");
    const app = createApp(prisma, redis);

    // Create HTTP server
    const server = http.createServer(app);

    // Start listening
    const port = config.API_PORT;
    const host = config.API_HOST;

    server.listen(port, host, () => {
      console.log("\n✅ Grocio API is running!");
      console.log(`   Server: http://${host}:${port}`);
      console.log(`   API: http://${host}:${port}${config.API_PREFIX}`);
      console.log(`   Health: http://${host}:${port}/health`);
      console.log("\n📖 Documentation: http://localhost:3000/api/docs");
      console.log("   Ready to accept requests! 🎉\n");
    });

    // Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use`);
        process.exit(1);
      }
      throw error;
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n⏹️  Shutting down gracefully...");

      server.close(async () => {
        console.log("🛑 Server closed");

        await prisma.$disconnect();
        console.log("🔌 Database disconnected");

        await redis.quit();
        console.log("🔌 Redis disconnected");

        console.log("✅ Graceful shutdown complete");
        process.exit(0);
      });

      // Forcefully exit after 10 seconds
      setTimeout(() => {
        console.error("❌ Forced shutdown after 10 seconds");
        process.exit(1);
      }, 10000);
    });

    process.on("SIGTERM", async () => {
      console.log("\n⏹️  SIGTERM received, shutting down...");

      server.close(async () => {
        await prisma.$disconnect();
        await redis.quit();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start server
main();
