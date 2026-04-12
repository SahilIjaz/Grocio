/**
 * Environment configuration
 * Validates and loads environment variables with Zod
 */

import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default("localhost"),
  API_PREFIX: z.string().default("/api/v1"),

  // Database
  DATABASE_URL: z.string().describe("PostgreSQL connection string"),

  // Redis
  REDIS_URL: z.string().describe("Redis connection string"),

  // JWT
  JWT_PRIVATE_KEY: z.string().describe("RSA private key (base64 or raw)"),
  JWT_PUBLIC_KEY: z.string().describe("RSA public key (base64 or raw)"),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(3600), // 1 hour
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(604800), // 7 days

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Load and validate environment variables
 */
let config: Environment;

try {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    API_PORT: process.env.API_PORT,
    API_HOST: process.env.API_HOST,
    API_PREFIX: process.env.API_PREFIX,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
    JWT_ACCESS_TOKEN_TTL: process.env.JWT_ACCESS_TOKEN_TTL,
    JWT_REFRESH_TOKEN_TTL: process.env.JWT_REFRESH_TOKEN_TTL,
    BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  config = envSchema.parse(env);

  console.log("✅ Configuration loaded successfully");
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.errors
      .filter((e) => e.code === "invalid_type")
      .map((e) => e.path.join("."))
      .join(", ");

    console.error("❌ Configuration validation failed:");
    console.error(`Missing or invalid environment variables: ${missing}`);
    console.error("\nPlease copy .env.example to .env.local and fill in the values:");
    console.error("$ cp .env.example .env.local");
  }
  process.exit(1);
}

/**
 * Helper to decode JWT keys (if base64 encoded)
 */
const decodeKey = (key: string): string => {
  // Check if key is base64 encoded (doesn't start with -----)
  if (!key.startsWith("-----")) {
    try {
      return Buffer.from(key, "base64").toString("utf-8");
    } catch {
      return key;
    }
  }
  return key;
};

/**
 * Export config getters
 */
export const getConfig = () => config;

export const getJWTKeys = () => {
  const privateKey = decodeKey(config.JWT_PRIVATE_KEY);
  const publicKey = decodeKey(config.JWT_PUBLIC_KEY);

  return { privateKey, publicKey };
};

export const isDevelopment = () => config.NODE_ENV === "development";
export const isProduction = () => config.NODE_ENV === "production";
export const isStaging = () => config.NODE_ENV === "staging";

export const getCORSOrigins = () => {
  return config.CORS_ORIGINS.split(",").map((origin) => origin.trim());
};

export default config;
