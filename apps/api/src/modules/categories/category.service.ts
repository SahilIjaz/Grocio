/**
 * Category business logic layer
 * Orchestrates repository, handles validation, enforces business rules
 */

import { PrismaClient, Category } from "@prisma/client";
import { CreateCategoryRequest, UpdateCategoryRequest } from "./category.schemas";
import { CategoryRepository } from "./category.repository";
import { ValidationError, NotFoundError } from "@/utils/AppError";

export class CategoryService {
  private repository: CategoryRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new CategoryRepository(prisma);
  }

  /**
   * Create a new category
   * Store admin can only create in their own tenant
   */
  async createCategory(
    tenantId: string,
    input: CreateCategoryRequest,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Category> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot create category for other tenant");
      }
    }

    return this.repository.createCategory(tenantId, input, actorId || requesterId);
  }

  /**
   * Get category details
   */
  async getCategory(tenantId: string, categoryId: string): Promise<Category> {
    const category = await this.repository.findCategoryById(tenantId, categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    return category;
  }

  /**
   * Get category with children (for tree view)
   */
  async getCategoryWithChildren(
    tenantId: string,
    categoryId: string
  ): Promise<Category & { children: Category[] }> {
    const category = await this.repository.getCategoryWithChildren(tenantId, categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    return category;
  }

  /**
   * Update category
   * Store admin can only update in their own tenant
   */
  async updateCategory(
    tenantId: string,
    categoryId: string,
    input: UpdateCategoryRequest,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Category> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot update category for other tenant");
      }
    }

    // Verify category exists
    await this.getCategory(tenantId, categoryId);

    return this.repository.updateCategory(tenantId, categoryId, input, actorId || requesterId);
  }

  /**
   * Delete category
   * Store admin can only delete from their own tenant
   */
  async deleteCategory(
    tenantId: string,
    categoryId: string,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Category> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot delete category for other tenant");
      }
    }

    // Verify category exists
    await this.getCategory(tenantId, categoryId);

    return this.repository.deleteCategory(tenantId, categoryId, actorId || requesterId);
  }

  /**
   * List categories
   */
  async listCategories(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      includeInactive?: boolean;
      parentId?: string;
    }
  ): Promise<{
    categories: Category[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repository.listCategories(tenantId, options);
  }

  /**
   * Check if slug is available
   */
  async checkSlugAvailable(tenantId: string, slug: string): Promise<boolean> {
    return this.repository.isCategorySlugUnique(tenantId, slug);
  }
}

/**
 * Factory function to create service instance
 */
export function createCategoryService(prisma: PrismaClient): CategoryService {
  return new CategoryService(prisma);
}
