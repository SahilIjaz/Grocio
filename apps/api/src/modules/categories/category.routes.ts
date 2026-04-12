/**
 * Category routes
 * Category CRUD endpoints with authorization
 */

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { CategoryController } from "./category.controller";
import { authorize } from "@/middleware/authorize";
import { validate, validateQuery } from "@/middleware/validate";
import { createCategorySchema, updateCategorySchema, listCategoriesQuerySchema } from "./category.schemas";

export function createCategoryRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new CategoryController(prisma);

  /**
   * POST /api/v1/categories
   * Create a new category
   * Store admin only
   *
   * Body:
   * {
   *   "name": "Produce",
   *   "slug": "produce",
   *   "description": "Fresh fruits and vegetables",
   *   "sortOrder": 1,
   *   "isActive": true
   * }
   *
   * Response: 201 Created
   * {
   *   "success": true,
   *   "data": { id, name, slug, description, parentId, sortOrder, isActive, createdAt }
   * }
   */
  router.post(
    "/",
    authorize("store_admin"),
    validate(createCategorySchema),
    controller.createCategory
  );

  /**
   * GET /api/v1/categories
   * List all categories for tenant
   * Public endpoint
   *
   * Query:
   * ?page=1&limit=20&includeInactive=false&parentId=...
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": [ { id, name, slug, description, parentId, sortOrder, isActive } ],
   *   "meta": { page, limit, total }
   * }
   */
  router.get(
    "/",
    validateQuery(listCategoriesQuerySchema),
    controller.listCategories
  );

  /**
   * GET /api/v1/categories/:slug/check-slug
   * Check if category slug is available
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
   * GET /api/v1/categories/:id
   * Get category details
   * Public endpoint
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { id, name, slug, description, parentId, sortOrder, isActive, createdAt, updatedAt }
   * }
   */
  router.get("/:id", controller.getCategory);

  /**
   * GET /api/v1/categories/:id/with-children
   * Get category with children (for tree view)
   * Public endpoint
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     id, name, slug, description, parentId, sortOrder, isActive,
   *     children: [ { id, name, slug, sortOrder } ]
   *   }
   * }
   */
  router.get("/:id/with-children", controller.getCategoryWithChildren);

  /**
   * PATCH /api/v1/categories/:id
   * Update category
   * Store admin only
   *
   * Body (all optional):
   * {
   *   "name": "Updated Name",
   *   "description": "New description"
   * }
   *
   * Response: 200 OK
   * {
   *   "success": true,
   *   "data": { id, name, slug, description, parentId, sortOrder, isActive, updatedAt }
   * }
   */
  router.patch(
    "/:id",
    authorize("store_admin"),
    validate(updateCategorySchema),
    controller.updateCategory
  );

  /**
   * DELETE /api/v1/categories/:id
   * Delete category
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
    controller.deleteCategory
  );

  return router;
}
