import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { CartController, createCartController } from "./cart.controller";
import { CartService, createCartService } from "./cart.service";
import { authorize, validate } from "@/middleware";
import {
  addItemSchema,
  updateItemSchema,
  mergeCartSchema,
} from "./cart.schemas";

/**
 * Create cart router
 * All routes require authentication and customer or store_admin role
 *
 * Routes:
 *   GET    /                    Get current user's cart
 *   POST   /items               Add item to cart
 *   PATCH  /items/:productId    Update item quantity
 *   DELETE /items/:productId    Remove item from cart
 *   POST   /merge               Merge guest cart into authenticated cart
 *   DELETE /                    Clear all items from cart
 *
 * @param prisma Prisma client
 * @param redis Redis client for guest cart operations
 * @returns Express router
 */
export function createCartRouter(
  prisma: PrismaClient,
  redis: Redis
): Router {
  const router = Router();

  const cartService = createCartService(prisma, redis);
  const cartController = createCartController(cartService);

  /**
   * GET /api/v1/cart
   * Get current user's cart (authenticated only)
   *
   * @returns {object} Cart with items, totals
   * @example
   * GET /api/v1/cart
   * Authorization: Bearer <accessToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "items": [
   *       {
   *         "id": "...",
   *         "productId": "...",
   *         "quantity": 2,
   *         "unitPrice": "9.99",
   *         "subtotal": "19.98",
   *         "product": { "id": "...", "name": "...", "sku": "...", ... }
   *       }
   *     ],
   *     "itemCount": 1,
   *     "total": "19.98"
   *   }
   * }
   */
  router.get(
    "/",
    authorize("store_admin", "customer"),
    cartController.getCart
  );

  /**
   * POST /api/v1/cart/items
   * Add item to cart (authenticated only)
   *
   * @body {string} productId - Product UUID
   * @body {number} quantity - Quantity (>=1)
   * @returns {object} Updated cart
   * @example
   * POST /api/v1/cart/items
   * Authorization: Bearer <accessToken>
   * Content-Type: application/json
   *
   * {
   *   "productId": "550e8400-e29b-41d4-a716-446655440000",
   *   "quantity": 2
   * }
   *
   * 200 OK
   * { "success": true, "data": { ... cart ... } }
   *
   * @throws 404 if product not found
   * @throws 422 if insufficient stock
   */
  router.post(
    "/items",
    authorize("store_admin", "customer"),
    validate(addItemSchema),
    cartController.addItem
  );

  /**
   * PATCH /api/v1/cart/items/:productId
   * Update item quantity in cart (authenticated only)
   *
   * @param {string} productId - Product UUID
   * @body {number} quantity - New quantity (>=1)
   * @returns {object} Updated cart
   * @example
   * PATCH /api/v1/cart/items/550e8400-e29b-41d4-a716-446655440000
   * Authorization: Bearer <accessToken>
   * Content-Type: application/json
   *
   * { "quantity": 5 }
   *
   * 200 OK
   * { "success": true, "data": { ... cart ... } }
   *
   * @throws 404 if product not in cart
   * @throws 422 if insufficient stock
   */
  router.patch(
    "/items/:productId",
    authorize("store_admin", "customer"),
    validate(updateItemSchema),
    cartController.updateItem
  );

  /**
   * DELETE /api/v1/cart/items/:productId
   * Remove item from cart (authenticated only)
   *
   * @param {string} productId - Product UUID
   * @returns {object} Updated cart
   * @example
   * DELETE /api/v1/cart/items/550e8400-e29b-41d4-a716-446655440000
   * Authorization: Bearer <accessToken>
   *
   * 200 OK
   * { "success": true, "data": { ... cart ... } }
   *
   * @throws 404 if product not in cart
   */
  router.delete(
    "/items/:productId",
    authorize("store_admin", "customer"),
    cartController.removeItem
  );

  /**
   * POST /api/v1/cart/merge
   * Merge guest cart into authenticated user's cart (authenticated only)
   * Reads guest cart from Redis, upserts all items, then deletes guest cart
   *
   * @body {string} guestId - Guest cart ID (from localStorage)
   * @returns {object} Merged cart
   * @example
   * POST /api/v1/cart/merge
   * Authorization: Bearer <accessToken>
   * Content-Type: application/json
   *
   * { "guestId": "550e8400-e29b-41d4-a716-446655440000" }
   *
   * 200 OK
   * { "success": true, "data": { ... merged cart ... } }
   *
   * Note: If guest cart doesn't exist or is empty, just returns user's current cart
   * Note: If any guest items exceed available stock, they are partially added (up to available stock)
   * Note: Products that no longer exist are silently skipped
   */
  router.post(
    "/merge",
    authorize("store_admin", "customer"),
    validate(mergeCartSchema),
    cartController.mergeCart
  );

  /**
   * DELETE /api/v1/cart
   * Clear all items from cart (authenticated only)
   *
   * @returns {object} Empty cart
   * @example
   * DELETE /api/v1/cart
   * Authorization: Bearer <accessToken>
   *
   * 200 OK
   * { "success": true, "data": { "items": [], "itemCount": 0, "total": "0.00" } }
   */
  router.delete(
    "/",
    authorize("store_admin", "customer"),
    cartController.clearCart
  );

  return router;
}

export default createCartRouter;
