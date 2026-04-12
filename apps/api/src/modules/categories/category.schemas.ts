/**
 * Category request/response schemas using Zod
 * All category input validation happens here
 */

import { z } from "zod";

/**
 * Create category schema
 * Used to create a new category within a tenant
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters")
    .trim(),

  slug: z
    .string()
    .min(1, "Category slug is required")
    .max(100, "Category slug must be less than 100 characters")
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .trim(),

  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional(),

  parentId: z
    .string()
    .uuid("Parent category ID must be a valid UUID")
    .optional(),

  sortOrder: z
    .number()
    .int("Sort order must be an integer")
    .nonnegative("Sort order must be non-negative")
    .default(0),

  isActive: z
    .boolean("Is active must be a boolean")
    .default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;

/**
 * List categories query schema
 * Filtering and pagination options
 */
export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeInactive: z.coerce.boolean().default(false),
  parentId: z.string().uuid().optional(),
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
