/**
 * Category data access layer
 * All Prisma queries for category operations
 * Always receives tenantId as explicit argument for isolation
 */

import { PrismaClient, Category } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/utils/AppError";
import { auditLog } from "@/services/audit.service";

export class CategoryRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new category
   */
  async createCategory(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      parentId?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
    actorId?: string
  ): Promise<Category> {
    // Check slug uniqueness within tenant
    const existing = await this.prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: data.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictError("Category slug already exists for this tenant");
    }

    // If parentId provided, verify it exists and belongs to same tenant
    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent || parent.tenantId !== tenantId) {
        throw new NotFoundError("Parent category not found");
      }
    }

    const category = await this.prisma.category.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "CREATE",
        entityType: "category",
        entityId: category.id,
        newValues: {
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
        },
      });
    }

    return category;
  }

  /**
   * Find category by ID (must belong to tenant)
   */
  async findCategoryById(tenantId: string, categoryId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
    });
  }

  /**
   * Update category
   */
  async updateCategory(
    tenantId: string,
    categoryId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      parentId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    actorId?: string
  ): Promise<Category> {
    const category = await this.findCategoryById(tenantId, categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // If updating slug, check uniqueness
    if (data.slug && data.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: {
          tenantId_slug: {
            tenantId,
            slug: data.slug,
          },
        },
      });

      if (existing) {
        throw new ConflictError("Category slug already exists for this tenant");
      }
    }

    // If updating parentId, verify it exists and belongs to same tenant
    if (data.parentId !== undefined && data.parentId !== category.parentId) {
      if (data.parentId) {
        const parent = await this.prisma.category.findFirst({
          where: {
            id: data.parentId,
            tenantId,
          },
        });

        if (!parent) {
          throw new NotFoundError("Parent category not found");
        }

        // Prevent self-referencing or circular references
        if (data.parentId === categoryId) {
          throw new ConflictError("Category cannot be its own parent");
        }
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name ?? category.name,
        slug: data.slug ?? category.slug,
        description: data.description !== undefined ? data.description : category.description,
        parentId: data.parentId !== undefined ? data.parentId : category.parentId,
        sortOrder: data.sortOrder ?? category.sortOrder,
        isActive: data.isActive ?? category.isActive,
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "UPDATE",
        entityType: "category",
        entityId: categoryId,
        oldValues: {
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
        },
        newValues: {
          name: updated.name,
          slug: updated.slug,
          isActive: updated.isActive,
        },
      });
    }

    return updated;
  }

  /**
   * Delete category (only if no products reference it)
   */
  async deleteCategory(tenantId: string, categoryId: string, actorId?: string): Promise<Category> {
    const category = await this.findCategoryById(tenantId, categoryId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    // Check for child categories
    const childCount = await this.prisma.category.count({
      where: {
        parentId: categoryId,
        tenantId,
      },
    });

    if (childCount > 0) {
      throw new ConflictError("Cannot delete category with child categories");
    }

    // Check for products in this category
    const productCount = await this.prisma.product.count({
      where: {
        categoryId,
        tenantId,
      },
    });

    if (productCount > 0) {
      throw new ConflictError("Cannot delete category with products");
    }

    const deleted = await this.prisma.category.delete({
      where: { id: categoryId },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "DELETE",
        entityType: "category",
        entityId: categoryId,
        oldValues: {
          name: deleted.name,
          slug: deleted.slug,
        },
      });
    }

    return deleted;
  }

  /**
   * List categories for tenant with pagination
   */
  async listCategories(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      includeInactive?: boolean;
      parentId?: string;
    }
  ): Promise<{ categories: Category[]; total: number; page: number; limit: number }> {
    const { page, limit, includeInactive = false, parentId } = options;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(parentId && { parentId }),
      ...(includeInactive === false && { isActive: true }),
    };

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      categories,
      total,
      page,
      limit,
    };
  }

  /**
   * Get categories with children (for tree view)
   */
  async getCategoryWithChildren(tenantId: string, categoryId: string): Promise<
    | (Category & {
        children: Category[];
      })
    | null
  > {
    const category = await this.findCategoryById(tenantId, categoryId);
    if (!category) {
      return null;
    }

    const children = await this.prisma.category.findMany({
      where: {
        parentId: categoryId,
        tenantId,
      },
      orderBy: { sortOrder: "asc" },
    });

    return {
      ...category,
      children,
    };
  }

  /**
   * Check if slug is unique for tenant
   */
  async isCategorySlugUnique(tenantId: string, slug: string): Promise<boolean> {
    const existing = await this.prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
    });

    return !existing;
  }
}

/**
 * Factory function to create repository instance
 */
export function createCategoryRepository(prisma: PrismaClient): CategoryRepository {
  return new CategoryRepository(prisma);
}
