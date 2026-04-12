/**
 * Product request/response schemas using Zod
 * All product input validation happens here
 */

import { z } from "zod";

/**
 * Create product schema
 * Used to create a new product within a tenant
 */
export const createProductSchema = z.object({
  categoryId: z
    .string()
    .uuid("Category ID must be a valid UUID"),

  name: z
    .string()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters")
    .trim(),

  slug: z
    .string()
    .min(1, "Product slug is required")
    .max(200, "Product slug must be less than 200 characters")
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .trim(),

  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .trim()
    .optional(),

  sku: z
    .string()
    .min(1, "SKU is required")
    .max(80, "SKU must be less than 80 characters")
    .trim(),

  price: z
    .number()
    .positive("Price must be greater than 0"),

  comparePrice: z
    .number()
    .positive("Compare price must be greater than 0")
    .optional(),

  stockQuantity: z
    .number()
    .int("Stock quantity must be an integer")
    .nonnegative("Stock quantity cannot be negative")
    .default(0),

  lowStockThreshold: z
    .number()
    .int("Low stock threshold must be an integer")
    .nonnegative("Low stock threshold cannot be negative")
    .default(10),

  unit: z
    .string()
    .max(30, "Unit must be less than 30 characters")
    .default("piece"),

  imageUrls: z
    .array(
      z
        .string()
        .url("Each image URL must be valid")
    )
    .optional(),

  tags: z
    .array(
      z
        .string()
        .max(50, "Each tag must be less than 50 characters")
    )
    .optional(),

  isActive: z
    .boolean("Is active must be a boolean")
    .default(true),

  isFeatured: z
    .boolean("Is featured must be a boolean")
    .default(false),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductRequest = z.infer<typeof createProductSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;

/**
 * Update product stock schema
 * Used to update stock quantity with optional reason
 */
export const updateProductStockSchema = z.object({
  stockQuantity: z
    .number()
    .int("Stock quantity must be an integer")
    .nonnegative("Stock quantity cannot be negative"),

  reason: z
    .string()
    .max(200, "Reason must be less than 200 characters")
    .optional(),
});

export type UpdateProductStockRequest = z.infer<typeof updateProductStockSchema>;

/**
 * List products query schema
 * Filtering, pagination, and search options
 */
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  tags: z
    .union([
      z.string().transform((s) => [s]),
      z.array(z.string()),
    ])
    .optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
