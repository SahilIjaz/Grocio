/**
 * Category HTTP controllers
 * Parse requests, validate, call service, send responses
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { CategoryService } from "./category.service";
import { createCategorySchema, updateCategorySchema, listCategoriesQuerySchema } from "./category.schemas";
import { sendSuccess, sendCreated, sendPaginated } from "@/utils/response";
import { asyncHandler } from "@/utils/asyncHandler";

export class CategoryController {
  private service: CategoryService;

  constructor(private prisma: PrismaClient) {
    this.service = new CategoryService(prisma);
  }

  /**
   * POST /api/v1/categories
   * Create a new category
   * Auth required (store_admin only)
   */
  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const validated = createCategorySchema.parse(req.body);

    const category = await this.service.createCategory(
      req.tenantId!,
      validated,
      req.user?.sub!,
      req.user?.role!,
      req.user?.sub
    );

    sendCreated(res, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
    });
  });

  /**
   * GET /api/v1/categories
   * List all categories for tenant
   * Public endpoint
   */
  listCategories = asyncHandler(async (req: Request, res: Response) => {
    const validated = listCategoriesQuerySchema.parse(req.query);

    const result = await this.service.listCategories(req.tenantId!, {
      page: validated.page,
      limit: validated.limit,
      includeInactive: validated.includeInactive,
      parentId: validated.parentId,
    });

    sendPaginated(
      res,
      result.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        parentId: c.parentId,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }
    );
  });

  /**
   * GET /api/v1/categories/:id
   * Get category details
   * Public endpoint
   */
  getCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await this.service.getCategory(req.tenantId!, id);

    sendSuccess(res, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  });

  /**
   * GET /api/v1/categories/:id/with-children
   * Get category with children (for tree view)
   * Public endpoint
   */
  getCategoryWithChildren = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const categoryWithChildren = await this.service.getCategoryWithChildren(req.tenantId!, id);

    sendSuccess(res, {
      id: categoryWithChildren.id,
      name: categoryWithChildren.name,
      slug: categoryWithChildren.slug,
      description: categoryWithChildren.description,
      parentId: categoryWithChildren.parentId,
      sortOrder: categoryWithChildren.sortOrder,
      isActive: categoryWithChildren.isActive,
      children: categoryWithChildren.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
      })),
    });
  });

  /**
   * PATCH /api/v1/categories/:id
   * Update category
   * Auth required (store_admin only)
   */
  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validated = updateCategorySchema.parse(req.body);

    const updated = await this.service.updateCategory(
      req.tenantId!,
      id,
      validated,
      req.user?.sub!,
      req.user?.role!,
      req.user?.sub
    );

    sendSuccess(res, {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      parentId: updated.parentId,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    });
  });

  /**
   * DELETE /api/v1/categories/:id
   * Delete category
   * Auth required (store_admin only)
   */
  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.service.deleteCategory(req.tenantId!, id, req.user?.sub!, req.user?.role!, req.user?.sub);

    sendSuccess(res, {
      id,
      message: "Category deleted successfully",
    });
  });

  /**
   * GET /api/v1/categories/:slug/check-slug
   * Check if category slug is available
   * Public endpoint
   */
  checkSlugAvailable = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const available = await this.service.checkSlugAvailable(req.tenantId!, slug);

    sendSuccess(res, {
      slug,
      available,
    });
  });
}

/**
 * Factory function to create controller instance
 */
export function createCategoryController(prisma: PrismaClient): CategoryController {
  return new CategoryController(prisma);
}
