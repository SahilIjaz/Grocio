import { PrismaClient, Cart, CartItem } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Cart with items and product details
 */
export interface CartWithItems extends Cart {
  items: (CartItem & {
    product: {
      id: string;
      name: string;
      sku: string;
      stockQuantity: number;
      imageUrls: string[];
    };
  })[];
}

/**
 * Cart repository for database operations
 * All queries are scoped to tenantId for data isolation
 */
export class CartRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get or create cart for a user
   * Returns cart with all items and product details
   */
  async getOrCreateCart(tenantId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.upsert({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      create: {
        tenantId,
        userId,
      },
      update: {},
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stockQuantity: true,
                imageUrls: true,
              },
            },
          },
        },
      },
    });

    return cart as CartWithItems;
  }

  /**
   * Get cart by user, or null if not found
   */
  async getCart(tenantId: string, userId: string): Promise<CartWithItems | null> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        tenantId,
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stockQuantity: true,
                imageUrls: true,
              },
            },
          },
        },
      },
    });

    return cart as CartWithItems | null;
  }

  /**
   * Add item to cart (upsert semantics)
   * If item already in cart, increment quantity
   * Otherwise, create new item
   */
  async addItem(
    tenantId: string,
    cartId: string,
    productId: string,
    quantity: number,
    unitPrice: Decimal
  ): Promise<CartItem> {
    // First, try to find existing item
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
        tenantId,
      },
    });

    if (existingItem) {
      // Increment quantity
      return await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: {
            increment: quantity,
          },
          updatedAt: new Date(),
        },
      });
    }

    // Create new item
    return await this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        tenantId,
        quantity,
        unitPrice,
      },
    });
  }

  /**
   * Update item quantity
   */
  async updateItem(
    tenantId: string,
    cartId: string,
    productId: string,
    quantity: number
  ): Promise<CartItem> {
    return await this.prisma.cartItem.updateMany({
      where: {
        cartId,
        productId,
        tenantId,
      },
      data: {
        quantity,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    tenantId: string,
    cartId: string,
    productId: string
  ): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId,
        productId,
        tenantId,
      },
    });
  }

  /**
   * Clear all items from cart
   */
  async clearCart(tenantId: string, userId: string): Promise<void> {
    // First find the cart
    const cart = await this.prisma.cart.findFirst({
      where: {
        tenantId,
        userId,
      },
    });

    if (!cart) {
      return;
    }

    // Delete all items
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        tenantId,
      },
    });
  }

  /**
   * Get item from cart
   */
  async getItem(
    tenantId: string,
    cartId: string,
    productId: string
  ): Promise<CartItem | null> {
    return await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
        tenantId,
      },
    });
  }

  /**
   * Delete entire cart (used when user is deleted)
   */
  async deleteCart(tenantId: string, userId: string): Promise<void> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        tenantId,
        userId,
      },
    });

    if (!cart) {
      return;
    }

    // Delete items first
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    // Delete cart
    await this.prisma.cart.delete({
      where: { id: cart.id },
    });
  }
}

/**
 * Factory function to create cart repository
 */
export function createCartRepository(prisma: PrismaClient): CartRepository {
  return new CartRepository(prisma);
}
