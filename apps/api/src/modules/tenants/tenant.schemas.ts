/**
 * Tenant request/response schemas using Zod
 * All tenant input validation happens here
 */

import { z } from "zod";

/**
 * Create tenant schema (also creates store_admin user)
 * Used during store registration
 */
export const createTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(120, "Store name must be less than 120 characters")
    .trim(),

  slug: z
    .string()
    .min(2, "Store slug must be at least 2 characters")
    .max(60, "Store slug must be less than 60 characters")
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .trim(),

  contactEmail: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  contactPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be less than 20 characters")
    .optional(),

  address: z
    .string()
    .max(255, "Address must be less than 255 characters")
    .trim()
    .optional(),

  ownerFirstName: z
    .string()
    .min(1, "First name is required")
    .max(80, "First name must be less than 80 characters")
    .trim(),

  ownerLastName: z
    .string()
    .min(1, "Last name is required")
    .max(80, "Last name must be less than 80 characters")
    .trim(),

  ownerEmail: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  ownerPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one digit")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),

  ownerPasswordConfirm: z.string(),

  settings: z
    .object({
      currency: z.string().default("USD"),
      timezone: z.string().default("America/Los_Angeles"),
      taxRate: z.number().min(0).max(1).default(0.0),
      deliveryFee: z.number().min(0).default(0),
      orderPrefix: z.string().max(10).default("ORD"),
    })
    .optional(),
});

export const createTenantWithConfirmSchema = createTenantSchema.refine(
  (data) => data.ownerPassword === data.ownerPasswordConfirm,
  {
    message: "Passwords do not match",
    path: ["ownerPasswordConfirm"],
  }
);

export type CreateTenantRequest = z.infer<typeof createTenantWithConfirmSchema>;

/**
 * Update tenant schema
 * Store admin can update their own tenant profile
 */
export const updateTenantSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(120, "Store name must be less than 120 characters")
    .trim()
    .optional(),

  contactEmail: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim()
    .optional(),

  contactPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be less than 20 characters")
    .optional(),

  address: z
    .string()
    .max(255, "Address must be less than 255 characters")
    .trim()
    .optional(),

  logoUrl: z
    .string()
    .url("Invalid URL")
    .optional(),

  settings: z
    .object({
      currency: z.string().optional(),
      timezone: z.string().optional(),
      taxRate: z.number().min(0).max(1).optional(),
      deliveryFee: z.number().min(0).optional(),
      orderPrefix: z.string().max(10).optional(),
    })
    .optional(),
});

export type UpdateTenantRequest = z.infer<typeof updateTenantSchema>;

/**
 * Suspend/Activate tenant schema
 * Super admin only
 */
export const suspendTenantSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason must be less than 500 characters")
    .optional(),
});

export type SuspendTenantRequest = z.infer<typeof suspendTenantSchema>;

/**
 * List tenants with filters
 */
export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["active", "suspended", "pending"]).optional(),
  search: z.string().optional(),
});

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
