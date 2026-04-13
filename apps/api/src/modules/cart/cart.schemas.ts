import { z } from "zod";

/**
 * Schema for adding an item to cart
 * @example { "productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 2 }
 */
export const addItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
});

export type AddItemRequest = z.infer<typeof addItemSchema>;

/**
 * Schema for updating cart item quantity
 * @example { "quantity": 5 }
 */
export const updateItemSchema = z.object({
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
});

export type UpdateItemRequest = z.infer<typeof updateItemSchema>;

/**
 * Schema for merging guest cart into authenticated cart
 * @example { "guestId": "550e8400-e29b-41d4-a716-446655440000" }
 */
export const mergeCartSchema = z.object({
  guestId: z
    .string()
    .uuid("Invalid guest ID format")
    .describe("Guest cart ID from localStorage (gct_id)"),
});

export type MergeCartRequest = z.infer<typeof mergeCartSchema>;
