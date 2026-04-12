/**
 * Redis client instance
 * Singleton pattern to ensure only one connection
 */

import Redis from "ioredis";

let redis: Redis;

/**
 * Get or create Redis client instance
 */
export const getRedisClient = (): Redis => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    redis = new Redis(redisUrl, {
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis reconnecting attempt ${times}, retrying in ${delay}ms...`);
        return delay;
      },
      reconnectOnError: (err: any) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    });

    redis.on("connect", () => {
      console.log("✅ Redis connection established");
    });

    redis.on("error", (error: any) => {
      console.error("❌ Redis connection error:", error.message);
    });

    redis.on("reconnecting", () => {
      console.warn("⚠️  Redis reconnecting...");
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("SIGINT received, closing Redis connection...");
      await redis.quit();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, closing Redis connection...");
      await redis.quit();
      process.exit(0);
    });
  }

  return redis;
};

/**
 * Disconnect from Redis
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null as any;
  }
};

/**
 * Check Redis connection
 */
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const client = getRedisClient();
    await client.ping();
    console.log("✅ Redis connection successful");
    return true;
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    return false;
  }
};

export default getRedisClient;
