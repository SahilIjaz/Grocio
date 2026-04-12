/**
 * Product business logic layer
 * Orchestrates repository, handles validation, enforces business rules
 */

import { PrismaClient, Product } from "@prisma/client";
import { CreateProductRequest, UpdateProductRequest, UpdateProductStockRequest } from "./product.schemas";
import { ProductRepository } from "./product.repository";
import { ValidationError, NotFoundError } from "@/utils/AppError";

export class ProductService {
  private repository: ProductRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new ProductRepository(prisma);
  }

  /**
   * Create a new product
   * Store admin can only create in their own tenant
   */
  async createProduct(
    tenantId: string,
    input: CreateProductRequest,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Product> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot create product for other tenant");
      }
    }

    return this.repository.createProduct(tenantId, input, actorId || requesterId);
  }

  /**
   * Get product details
   */
  async getProduct(tenantId: string, productId: string): Promise<Product> {
    const product = await this.repository.findProductById(tenantId, productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  /**
   * Update product
   * Store admin can only update in their own tenant
   */
  async updateProduct(
    tenantId: string,
    productId: string,
    input: UpdateProductRequest,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Product> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot update product for other tenant");
      }
    }

    // Verify product exists
    await this.getProduct(tenantId, productId);

    return this.repository.updateProduct(tenantId, productId, input, actorId || requesterId);
  }

  /**
   * Delete product
   * Store admin can only delete from their own tenant
   */
  async deleteProduct(
    tenantId: string,
    productId: string,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Product> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot delete product for other tenant");
      }
    }

    // Verify product exists
    await this.getProduct(tenantId, productId);

    return this.repository.deleteProduct(tenantId, productId, actorId || requesterId);
  }

  /**
   * List products with filters
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
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repository.listProducts(tenantId, options);
  }

  /**
   * Update product stock
   * Store admin can only update in their own tenant
   */
  async updateStock(
    tenantId: string,
    productId: string,
    input: UpdateProductStockRequest,
    requesterId: string,
    requesterRole: string,
    actorId?: string
  ): Promise<Product> {
    // Tenant isolation check
    if (requesterRole === "store_admin") {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
      });

      if (requester?.tenantId !== tenantId) {
        throw new ValidationError("Cannot update stock for other tenant");
      }
    }

    // Verify product exists
    await this.getProduct(tenantId, productId);

    return this.repository.updateStock(tenantId, productId, input.stockQuantity, input.reason, actorId || requesterId);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<Product[]> {
    return this.repository.getLowStockProducts(tenantId);
  }

  /**
   * Check if SKU is available
   */
  async checkSkuAvailable(tenantId: string, sku: string): Promise<boolean> {
    return this.repository.isProductSkuUnique(tenantId, sku);
  }

  /**
   * Check if slug is available
   */
  async checkSlugAvailable(tenantId: string, slug: string): Promise<boolean> {
    return this.repository.isProductSlugUnique(tenantId, slug);
  }
}

/**
 * Factory function to create service instance
 */
export function createProductService(prisma: PrismaClient): ProductService {
  return new ProductService(prisma);
}
