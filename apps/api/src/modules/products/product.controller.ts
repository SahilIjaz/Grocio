/**
 * Product HTTP controllers
 * Parse requests, validate, call service, send responses
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ProductService } from "./product.service";
import { createProductSchema, updateProductSchema, updateProductStockSchema, listProductsQuerySchema } from "./product.schemas";
import { sendSuccess, sendCreated, sendPaginated } from "@/utils/response";
import { asyncHandler } from "@/utils/asyncHandler";

export class ProductController {
  private service: ProductService;

  constructor(private prisma: PrismaClient) {
    this.service = new ProductService(prisma);
  }

  /**
   * POST /api/v1/products
   * Create a new product
   * Auth required (store_admin only)
   */
  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = createProductSchema.parse(req.body);

    const product = await this.service.createProduct(
      req.tenantId!,
      validated,
      req.user?.sub!,
      req.user?.role!,
      req.user?.sub
    );

    sendCreated(res, {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      comparePrice: product.comparePrice,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      unit: product.unit,
      imageUrls: product.imageUrls,
      tags: product.tags,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt,
    });
  });

  /**
   * GET /api/v1/products
   * List products with filters
   * Public endpoint
   */
  listProducts = asyncHandler(async (req: Request, res: Response) => {
    const validated = listProductsQuerySchema.parse(req.query);

    const result = await this.service.listProducts(req.tenantId!, {
      page: validated.page,
      limit: validated.limit,
      categoryId: validated.categoryId,
      minPrice: validated.minPrice,
      maxPrice: validated.maxPrice,
      tags: Array.isArray(validated.tags) ? validated.tags : validated.tags ? [validated.tags] : undefined,
      search: validated.search,
      isActive: validated.isActive,
      isFeatured: validated.isFeatured,
      inStock: validated.inStock,
    });

    sendPaginated(
      res,
      result.products.map((p) => ({
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        comparePrice: p.comparePrice,
        stockQuantity: p.stockQuantity,
        isLowStock: p.stockQuantity <= p.lowStockThreshold,
        unit: p.unit,
        imageUrls: p.imageUrls,
        tags: p.tags,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
      })),
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }
    );
  });

  /**
   * GET /api/v1/products/:id
   * Get product details
   * Public endpoint
   */
  getProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await this.service.getProduct(req.tenantId!, id);

    sendSuccess(res, {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      price: product.price,
      comparePrice: product.comparePrice,
      stockQuantity: product.stockQuantity,
      isLowStock: product.stockQuantity <= product.lowStockThreshold,
      lowStockThreshold: product.lowStockThreshold,
      unit: product.unit,
      imageUrls: product.imageUrls,
      tags: product.tags,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  });

  /**
   * PATCH /api/v1/products/:id
   * Update product
   * Auth required (store_admin only)
   */
  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validated = updateProductSchema.parse(req.body);

    const updated = await this.service.updateProduct(
      req.tenantId!,
      id,
      validated,
      req.user?.sub!,
      req.user?.role!,
      req.user?.sub
    );

    sendSuccess(res, {
      id: updated.id,
      categoryId: updated.categoryId,
      name: updated.name,
      slug: updated.slug,
      sku: updated.sku,
      price: updated.price,
      stockQuantity: updated.stockQuantity,
      isActive: updated.isActive,
      isFeatured: updated.isFeatured,
      updatedAt: updated.updatedAt,
    });
  });

  /**
   * DELETE /api/v1/products/:id
   * Delete product
   * Auth required (store_admin only)
   */
  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.service.deleteProduct(req.tenantId!, id, req.user?.sub!, req.user?.role!, req.user?.sub);

    sendSuccess(res, {
      id,
      message: "Product deleted successfully",
    });
  });

  /**
   * PATCH /api/v1/products/:id/stock
   * Update product stock
   * Auth required (store_admin only)
   */
  updateStock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validated = updateProductStockSchema.parse(req.body);

    const updated = await this.service.updateStock(
      req.tenantId!,
      id,
      validated,
      req.user?.sub!,
      req.user?.role!,
      req.user?.sub
    );

    sendSuccess(res, {
      id: updated.id,
      stockQuantity: updated.stockQuantity,
      isLowStock: updated.stockQuantity <= updated.lowStockThreshold,
      message: "Stock updated successfully",
    });
  });

  /**
   * GET /api/v1/products/low-stock
   * Get low stock products
   * Auth required (store_admin only)
   */
  getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
    const products = await this.service.getLowStockProducts(req.tenantId!);

    sendSuccess(res, {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
      })),
      count: products.length,
    });
  });

  /**
   * GET /api/v1/products/:sku/check-sku
   * Check if product SKU is available
   * Public endpoint
   */
  checkSkuAvailable = asyncHandler(async (req: Request, res: Response) => {
    const { sku } = req.params;

    const available = await this.service.checkSkuAvailable(req.tenantId!, sku);

    sendSuccess(res, {
      sku,
      available,
    });
  });

  /**
   * GET /api/v1/products/:slug/check-slug
   * Check if product slug is available
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
export function createProductController(prisma: PrismaClient): ProductController {
  return new ProductController(prisma);
}
