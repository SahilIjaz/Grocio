/**
 * Product data access layer
 * All Prisma queries for product operations
 * Always receives tenantId as explicit argument for isolation
 */

import { PrismaClient, Product } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/utils/AppError";
import { auditLog } from "@/services/audit.service";

export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new product
   */
  async createProduct(
    tenantId: string,
    data: {
      categoryId: string;
      name: string;
      slug: string;
      description?: string;
      sku: string;
      price: number;
      comparePrice?: number;
      stockQuantity?: number;
      lowStockThreshold?: number;
      unit?: string;
      imageUrls?: string[];
      tags?: string[];
      isActive?: boolean;
      isFeatured?: boolean;
    },
    actorId?: string
  ): Promise<Product> {
    // Check SKU uniqueness within tenant
    const existingSku = await this.prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku: data.sku,
        },
      },
    });

    if (existingSku) {
      throw new ConflictError("Product SKU already exists for this tenant");
    }

    // Check slug uniqueness within tenant
    const existingSlug = await this.prisma.product.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: data.slug,
        },
      },
    });

    if (existingSlug) {
      throw new ConflictError("Product slug already exists for this tenant");
    }

    // Verify category belongs to tenant
    const category = await this.prisma.category.findFirst({
      where: {
        id: data.categoryId,
        tenantId,
      },
    });

    if (!category) {
      throw new NotFoundError("Category not found for this tenant");
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        categoryId: data.categoryId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        sku: data.sku,
        price: data.price,
        comparePrice: data.comparePrice || null,
        stockQuantity: data.stockQuantity ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 10,
        unit: data.unit ?? "piece",
        imageUrls: data.imageUrls || [],
        tags: data.tags || [],
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "CREATE",
        entityType: "product",
        entityId: product.id,
        newValues: {
          name: product.name,
          sku: product.sku,
          price: product.price,
          stock: product.stockQuantity,
        },
      });
    }

    return product;
  }

  /**
   * Find product by ID (must belong to tenant)
   */
  async findProductById(tenantId: string, productId: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
      },
    });
  }

  /**
   * Find product by SKU (must belong to tenant)
   */
  async findProductBySku(tenantId: string, sku: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku,
        },
      },
    });
  }

  /**
   * Update product
   */
  async updateProduct(
    tenantId: string,
    productId: string,
    data: {
      categoryId?: string;
      name?: string;
      slug?: string;
      description?: string | null;
      sku?: string;
      price?: number;
      comparePrice?: number | null;
      stockQuantity?: number;
      lowStockThreshold?: number;
      unit?: string;
      imageUrls?: string[];
      tags?: string[];
      isActive?: boolean;
      isFeatured?: boolean;
    },
    actorId?: string
  ): Promise<Product> {
    const product = await this.findProductById(tenantId, productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    // Check SKU uniqueness if updating
    if (data.sku && data.sku !== product.sku) {
      const existing = await this.prisma.product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: data.sku,
          },
        },
      });

      if (existing) {
        throw new ConflictError("Product SKU already exists for this tenant");
      }
    }

    // Check slug uniqueness if updating
    if (data.slug && data.slug !== product.slug) {
      const existing = await this.prisma.product.findUnique({
        where: {
          tenantId_slug: {
            tenantId,
            slug: data.slug,
          },
        },
      });

      if (existing) {
        throw new ConflictError("Product slug already exists for this tenant");
      }
    }

    // Verify category belongs to tenant if updating
    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: data.categoryId,
          tenantId,
        },
      });

      if (!category) {
        throw new NotFoundError("Category not found for this tenant");
      }
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: data.categoryId ?? product.categoryId,
        name: data.name ?? product.name,
        slug: data.slug ?? product.slug,
        description: data.description !== undefined ? data.description : product.description,
        sku: data.sku ?? product.sku,
        price: data.price ?? product.price,
        comparePrice: data.comparePrice !== undefined ? data.comparePrice : product.comparePrice,
        stockQuantity: data.stockQuantity ?? product.stockQuantity,
        lowStockThreshold: data.lowStockThreshold ?? product.lowStockThreshold,
        unit: data.unit ?? product.unit,
        imageUrls: data.imageUrls ?? product.imageUrls,
        tags: data.tags ?? product.tags,
        isActive: data.isActive ?? product.isActive,
        isFeatured: data.isFeatured ?? product.isFeatured,
      },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "UPDATE",
        entityType: "product",
        entityId: productId,
        oldValues: {
          name: product.name,
          price: product.price,
          stock: product.stockQuantity,
        },
        newValues: {
          name: updated.name,
          price: updated.price,
          stock: updated.stockQuantity,
        },
      });
    }

    return updated;
  }

  /**
   * Delete product
   */
  async deleteProduct(tenantId: string, productId: string, actorId?: string): Promise<Product> {
    const product = await this.findProductById(tenantId, productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const deleted = await this.prisma.product.delete({
      where: { id: productId },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "DELETE",
        entityType: "product",
        entityId: productId,
        oldValues: {
          name: deleted.name,
          sku: deleted.sku,
          price: deleted.price,
        },
      });
    }

    return deleted;
  }

  /**
   * List products with filters, search, and pagination
   */
  async listProducts(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      tags?: string[];
      search?: string;
      isActive?: boolean;
      isFeatured?: boolean;
      inStock?: boolean;
    }
  ): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const { page, limit, categoryId, minPrice, maxPrice, tags, search, isActive, isFeatured, inStock } = options;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(inStock && { stockQuantity: { gt: 0 } }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), lte: maxPrice } }),
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
    };
  }

  /**
   * Update product stock
   */
  async updateStock(
    tenantId: string,
    productId: string,
    newQuantity: number,
    reason?: string,
    actorId?: string
  ): Promise<Product> {
    const product = await this.findProductById(tenantId, productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newQuantity },
    });

    // Audit log
    if (actorId) {
      await auditLog(this.prisma, {
        tenantId,
        actorId,
        action: "UPDATE_STOCK",
        entityType: "product",
        entityId: productId,
        oldValues: { stockQuantity: product.stockQuantity },
        newValues: { stockQuantity: newQuantity, reason },
      });
    }

    return updated;
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        stockQuantity: {
          lte: this.prisma.raw(`low_stock_threshold`),
        },
      },
      orderBy: { stockQuantity: "asc" },
    });
  }

  /**
   * Check if SKU is unique for tenant
   */
  async isProductSkuUnique(tenantId: string, sku: string): Promise<boolean> {
    const existing = await this.prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku,
        },
      },
    });

    return !existing;
  }

  /**
   * Check if slug is unique for tenant
   */
  async isProductSlugUnique(tenantId: string, slug: string): Promise<boolean> {
    const existing = await this.prisma.product.findUnique({
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
export function createProductRepository(prisma: PrismaClient): ProductRepository {
  return new ProductRepository(prisma);
}
