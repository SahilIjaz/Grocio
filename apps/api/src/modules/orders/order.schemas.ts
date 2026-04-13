import { z } from "zod";

/**
 * Delivery address for an order
 */
const deliveryAddressSchema = z.object({
  line1: z
    .string()
    .min(3, "Street address must be at least 3 characters")
    .max(100, "Street address must be at most 100 characters")
    .trim(),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(50, "City must be at most 50 characters")
    .trim(),
  state: z
    .string()
    .min(2, "State must be at least 2 characters")
    .max(50, "State must be at most 50 characters")
    .trim(),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
    .trim(),
});

/**
 * Schema for creating an order from cart
 * @example {
 *   "deliveryAddress": {
 *     "line1": "123 Main Street",
 *     "city": "Springfield",
 *     "state": "Illinois",
 *     "zipCode": "62701"
 *   },
 *   "notes": "Leave at door"
 * }
 */
export const createOrderSchema = z.object({
  deliveryAddress: deliveryAddressSchema,
  notes: z
    .string()
    .max(500, "Notes must be at most 500 characters")
    .optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

/**
 * Schema for updating order status
 * @example { "status": "confirmed", "reason": "Payment confirmed" }
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
  reason: z
    .string()
    .max(200, "Reason must be at most 200 characters")
    .optional(),
});

export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>;

/**
 * Schema for listing orders with pagination and filtering
 */
export const listOrdersQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must be at most 100")
    .default(10),
  status: z
    .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"])
    .optional(),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

/**
 * Delivery address type
 */
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;
