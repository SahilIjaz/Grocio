import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Decimal } from "@prisma/client/runtime/library";
import { CartRepository, CartWithItems } from "./cart.repository";
import { ProductRepository } from "@/modules/products/product.repository";
import { GuestCartService, GuestCart, GuestCartItem } from "@/services/redis/guestCart.service";
import { NotFoundError, UnprocessableError } from "@/utils";

/**
 * Cart response structure sent to client
 */
export interface CartResponse {
  id: string;
  tenantId: string;
  userId: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    product: {
      id: string;
      name: string;
      sku: string;
      stockQuantity: number;
      imageUrls: string[];
    };
  }[];
  itemCount: number;
  total: string;
}

/**
 * Cart service containing business logic
 * Handles both authenticated and guest carts
 */
export class CartService {
  private cartRepo: CartRepository;
  private productRepo: ProductRepository;
  private guestCartService: GuestCartService;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {
    this.cartRepo = new CartRepository(prisma);
    this.productRepo = new ProductRepository(prisma);
    this.guestCartService = new GuestCartService(redis);
  }

  /**
   * Get current user's cart
   */
  async getCart(tenantId: string, userId: string): Promise<CartResponse> {
    const cart = await this.cartRepo.getCart(tenantId, userId);

    if (!cart) {
      // Return empty cart response
      return {
        id: "",
        tenantId,
        userId,
        items: [],
        itemCount: 0,
        total: "0.00",
      };
    }

    return this.formatCartResponse(cart);
  }

  /**
   * Add item to authenticated user's cart
   * Validates stock availability and gets price snapshot
   */
  async addItem(
    tenantId: string,
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartResponse> {
    // Get product to validate it exists and check stock
    const product = await this.productRepo.findProductById(tenantId, productId);
    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    // Check stock availability
    if (product.stockQuantity < quantity) {
      throw new UnprocessableError("Insufficient stock available", {
        available: product.stockQuantity,
        requested: quantity,
      });
    }

    // Get or create cart
    const cart = await this.cartRepo.getOrCreateCart(tenantId, userId);

    // Check total quantity if item already exists
    const existingItem = cart.items.find((i) => i.productId === productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;

    if (totalQuantity > product.stockQuantity) {
      throw new UnprocessableError("Insufficient stock available", {
        available: product.stockQuantity,
        requested: totalQuantity,
      });
    }

    // Add item with price snapshot
    await this.cartRepo.addItem(
      tenantId,
      cart.id,
      productId,
      quantity,
      new Decimal(product.price.toString())
    );

    // Return updated cart
    const updatedCart = await this.cartRepo.getCart(tenantId, userId);
    if (!updatedCart) {
      throw new Error("Failed to retrieve updated cart");
    }

    return this.formatCartResponse(updatedCart);
  }

  /**
   * Update item quantity in cart
   * Validates stock availability
   */
  async updateItem(
    tenantId: string,
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartResponse> {
    // Get cart
    const cart = await this.cartRepo.getCart(tenantId, userId);
    if (!cart) {
      throw new NotFoundError("Cart not found for user");
    }

    // Find item in cart
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundError("Product", productId, "not in cart");
    }

    // Get product to check stock
    const product = await this.productRepo.findProductById(tenantId, productId);
    if (!product) {
      throw new NotFoundError("Product", productId);
    }

    // Check stock availability
    if (quantity > product.stockQuantity) {
      throw new UnprocessableError("Insufficient stock available", {
        available: product.stockQuantity,
        requested: quantity,
      });
    }

    // Update item
    await this.cartRepo.updateItem(tenantId, cart.id, productId, quantity);

    // Return updated cart
    const updatedCart = await this.cartRepo.getCart(tenantId, userId);
    if (!updatedCart) {
      throw new Error("Failed to retrieve updated cart");
    }

    return this.formatCartResponse(updatedCart);
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    tenantId: string,
    userId: string,
    productId: string
  ): Promise<CartResponse> {
    // Get cart
    const cart = await this.cartRepo.getCart(tenantId, userId);
    if (!cart) {
      throw new NotFoundError("Cart not found for user");
    }

    // Check item exists
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundError("Product", productId, "not in cart");
    }

    // Remove item
    await this.cartRepo.removeItem(tenantId, cart.id, productId);

    // Return updated cart
    const updatedCart = await this.cartRepo.getCart(tenantId, userId);
    if (!updatedCart) {
      throw new Error("Failed to retrieve updated cart");
    }

    return this.formatCartResponse(updatedCart);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(tenantId: string, userId: string): Promise<CartResponse> {
    await this.cartRepo.clearCart(tenantId, userId);

    // Return empty cart
    const cart = await this.cartRepo.getCart(tenantId, userId);
    return this.formatCartResponse(
      cart || {
        id: "",
        tenantId,
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Merge guest cart into authenticated user's cart
   * Reads guest cart from Redis, upserts all items, then deletes guest cart key
   */
  async mergeCart(
    tenantId: string,
    userId: string,
    guestId: string
  ): Promise<CartResponse> {
    // Get guest cart from Redis
    const guestCart = await this.guestCartService.getGuestCart(tenantId, guestId);

    if (!guestCart || guestCart.items.length === 0) {
      // No guest cart or empty, just return user's current cart
      return await this.getCart(tenantId, userId);
    }

    // Get or create user's authenticated cart
    const authCart = await this.cartRepo.getOrCreateCart(tenantId, userId);

    // Merge each guest item into authenticated cart
    for (const guestItem of guestCart.items) {
      try {
        // Validate product still exists
        const product = await this.productRepo.findProductById(
          tenantId,
          guestItem.productId
        );

        if (!product) {
          // Product no longer exists, skip it
          continue;
        }

        // Check stock availability
        const existingItem = authCart.items.find(
          (i) => i.productId === guestItem.productId
        );
        const totalQuantity = (existingItem?.quantity || 0) + guestItem.quantity;

        if (totalQuantity > product.stockQuantity) {
          // Not enough stock, just add what we can
          const canAdd = Math.max(0, product.stockQuantity - (existingItem?.quantity || 0));
          if (canAdd > 0) {
            await this.cartRepo.addItem(
              tenantId,
              authCart.id,
              guestItem.productId,
              canAdd,
              new Decimal(guestItem.unitPrice.toString())
            );
          }
        } else {
          // Add all items
          await this.cartRepo.addItem(
            tenantId,
            authCart.id,
            guestItem.productId,
            guestItem.quantity,
            new Decimal(guestItem.unitPrice.toString())
          );
        }
      } catch {
        // Skip problematic items, continue with next
        continue;
      }
    }

    // Delete guest cart from Redis
    await this.guestCartService.deleteGuestCart(tenantId, guestId);

    // Return merged cart
    const mergedCart = await this.cartRepo.getCart(tenantId, userId);
    if (!mergedCart) {
      throw new Error("Failed to retrieve merged cart");
    }

    return this.formatCartResponse(mergedCart);
  }

  /**
   * Format cart for API response
   */
  private formatCartResponse(cart: CartWithItems): CartResponse {
    const items = cart.items.map((item) => {
      const subtotal = new Decimal(item.unitPrice).mul(item.quantity);
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        subtotal: subtotal.toString(),
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          stockQuantity: item.product.stockQuantity,
          imageUrls: item.product.imageUrls as string[],
        },
      };
    });

    const total = items.reduce((sum, item) => {
      return sum.plus(item.subtotal);
    }, new Decimal(0));

    return {
      id: cart.id,
      tenantId: cart.tenantId,
      userId: cart.userId,
      items,
      itemCount: items.length,
      total: total.toString(),
    };
  }
}

/**
 * Factory function to create cart service
 */
export function createCartService(
  prisma: PrismaClient,
  redis: Redis
): CartService {
  return new CartService(prisma, redis);
}
