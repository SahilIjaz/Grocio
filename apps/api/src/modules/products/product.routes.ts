/**
 * Product routes
 * Product CRUD endpoints with authorization and filters
 */

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ProductController } from "./product.controller";
import { authorize } from "@/middleware/authorize";
import { validate, validateQuery } from "@/middleware/validate";
import { createProductSchema, updateProductSchema, updateProductStockSchema, listProductsQuerySchema } from "./product.schemas";

export function createProductRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ProductController(prisma);

  /**
   * POST /api/v1/products
   * Create a new product
   * Store admin only
   *
   * Body:
   * {
   *   "categoryId": "...",
   *   "name": "Red Apples",
   *   "slug": "red-apples",
   *   "description": "Fresh, crisp red apples",
   *   "sku": "APPLE-RED-001",
   *   "price": 3.99,
   *   "comparePrice": 4.99,
   *   "stockQuantity": 100,
   *   "lowStockThreshold": 10,
   *   "unit": "lb",
   *   "imageUrls": ["https://cdn.example.com/apple.jpg"],
   *   "tags": ["organic", "fresh", "local"],
   *   "isActive": true,
   *   "isFeatured": true
   * }
   *
   * Response: 201 Created
   * {
   *   "success": true,
   *   "data": { id, categoryId, name, slug, sku, price, stockQuantity, ... }
   * }
   */
  router.post(
    "/",
    authorize("store_admin"),
    validate(createProductSchema),
    controller.createProduct
  );

  /**
   * GET /api/v1/products
   * List products with filters
   * Public endpoint
   *
   * Query:
   * ?page=1&limit=20&categoryId=...&minPrice=0&maxPrice=100&tags=organic,fresh&search=apple&inStock=true&isFeatured=false
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       id, categoryId, name, slug, sku, price, comparePrice, stockQuantity,
   *       isLowStock, unit, imageUrls, tags, isActive, isFeatured
   *     }
   *   ],
   *   "meta": { page, limit, total }
   * }
   */
  router.get(
    "/",
    validateQuery(listProductsQuerySchema),
    controller.listProducts
  );

  /**
   * GET /api/v1/products/:sku/check-sku
   * Check if product SKU is available
   * Public endpoint
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { sku, available: true|false }
   * }
   */
  router.get("/:sku/check-sku", controller.checkSkuAvailable);

  /**
   * GET /api/v1/products/:slug/check-slug
   * Check if product slug is available
   * Public endpoint
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { slug, available: true|false }
   * }
   */
  router.get("/:slug/check-slug", controller.checkSlugAvailable);

  /**
   * GET /api/v1/products/low-stock
   * Get low stock products (for admin alerts)
   * Store admin only
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     products: [
   *       { id, name, sku, stockQuantity, lowStockThreshold }
   *     ],
   *     count: 3
   *   }
   * }
   */
  router.get(
    "/low-stock",
    authorize("store_admin"),
    controller.getLowStockProducts
  );

  /**
   * GET /api/v1/products/:id
   * Get product details
   * Public endpoint
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     id, categoryId, name, slug, description, sku, price, comparePrice,
   *     stockQuantity, isLowStock, lowStockThreshold, unit, imageUrls, tags,
   *     isActive, isFeatured, createdAt, updatedAt
   *   }
   * }
   */
  router.get("/:id", controller.getProduct);

  /**
   * PATCH /api/v1/products/:id
   * Update product
   * Store admin only
   *
   * Body (all optional):
   * {
   *   "name": "Updated Name",
   *   "price": 4.99,
   *   "imageUrls": ["https://cdn.example.com/new-image.jpg"],
   *   "tags": ["organic", "fresh"]
   * }
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { id, categoryId, name, slug, sku, price, stockQuantity, isActive, isFeatured, updatedAt }
   * }
   */
  router.patch(
    "/:id",
    authorize("store_admin"),
    validate(updateProductSchema),
    controller.updateProduct
  );

  /**
   * PATCH /api/v1/products/:id/stock
   * Update product stock
   * Store admin only
   *
   * Body:
   * {
   *   "stockQuantity": 150,
   *   "reason": "Restocked from warehouse"
   * }
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { id, stockQuantity, isLowStock, message }
   * }
   */
  router.patch(
    "/:id/stock",
    authorize("store_admin"),
    validate(updateProductStockSchema),
    controller.updateStock
  );

  /**
   * DELETE /api/v1/products/:id
   * Delete product
   * Store admin only
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { id, message }
   * }
   */
  router.delete(
    "/:id",
    authorize("store_admin"),
    controller.deleteProduct
  );

  return router;
}
