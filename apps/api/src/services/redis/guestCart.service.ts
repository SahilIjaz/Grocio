import Redis from "ioredis";

/**
 * Guest cart item structure
 */
export interface GuestCartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  imageUrl: string | null;
}

/**
 * Guest cart structure stored in Redis
 */
export interface GuestCart {
  tenantId: string;
  items: GuestCartItem[];
}

// 7 days in seconds
const GUEST_CART_TTL = 7 * 24 * 60 * 60;

/**
 * Guest cart Redis service
 * Handles all guest cart operations before authentication
 * Key format: guest_cart:{tenantId}:{guestId}
 * Value: JSON stringified GuestCart
 * TTL: 7 days, reset on every write
 */
export class GuestCartService {
  constructor(private redis: Redis) {}

  /**
   * Get guest cart from Redis
   */
  async getGuestCart(
    tenantId: string,
    guestId: string
  ): Promise<GuestCart | null> {
    const key = this.buildKey(tenantId, guestId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as GuestCart;
    } catch {
      // Corrupted data, treat as not found
      return null;
    }
  }

  /**
   * Add or update item in guest cart
   * If item already exists, increment quantity
   */
  async addToGuestCart(
    tenantId: string,
    guestId: string,
    item: GuestCartItem
  ): Promise<GuestCart> {
    const key = this.buildKey(tenantId, guestId);
    const cart = (await this.getGuestCart(tenantId, guestId)) || {
      tenantId,
      items: [],
    };

    const existingIndex = cart.items.findIndex(
      (i) => i.productId === item.productId
    );

    if (existingIndex >= 0) {
      // Increment quantity, keep original price snapshot
      cart.items[existingIndex].quantity += item.quantity;
    } else {
      // Add new item
      cart.items.push(item);
    }

    await this.redis.setex(key, GUEST_CART_TTL, JSON.stringify(cart));
    return cart;
  }

  /**
   * Update quantity of item in guest cart
   */
  async updateGuestCartItem(
    tenantId: string,
    guestId: string,
    productId: string,
    quantity: number
  ): Promise<GuestCart> {
    const key = this.buildKey(tenantId, guestId);
    const cart = await this.getGuestCart(tenantId, guestId);

    if (!cart) {
      throw new Error("Guest cart not found");
    }

    const itemIndex = cart.items.findIndex((i) => i.productId === productId);
    if (itemIndex < 0) {
      throw new Error(`Product ${productId} not in guest cart`);
    }

    cart.items[itemIndex].quantity = quantity;

    await this.redis.setex(key, GUEST_CART_TTL, JSON.stringify(cart));
    return cart;
  }

  /**
   * Remove item from guest cart
   */
  async removeFromGuestCart(
    tenantId: string,
    guestId: string,
    productId: string
  ): Promise<GuestCart> {
    const key = this.buildKey(tenantId, guestId);
    const cart = await this.getGuestCart(tenantId, guestId);

    if (!cart) {
      throw new Error("Guest cart not found");
    }

    cart.items = cart.items.filter((i) => i.productId !== productId);

    await this.redis.setex(key, GUEST_CART_TTL, JSON.stringify(cart));
    return cart;
  }

  /**
   * Clear all items from guest cart (keep the cart, just empty items)
   */
  async clearGuestCart(
    tenantId: string,
    guestId: string
  ): Promise<GuestCart> {
    const key = this.buildKey(tenantId, guestId);
    const cart: GuestCart = { tenantId, items: [] };

    await this.redis.setex(key, GUEST_CART_TTL, JSON.stringify(cart));
    return cart;
  }

  /**
   * Delete guest cart completely (called after merge to authenticated cart)
   */
  async deleteGuestCart(tenantId: string, guestId: string): Promise<void> {
    const key = this.buildKey(tenantId, guestId);
    await this.redis.del(key);
  }

  /**
   * Build Redis key for guest cart
   */
  private buildKey(tenantId: string, guestId: string): string {
    return `guest_cart:${tenantId}:${guestId}`;
  }
}

/**
 * Factory function to create guest cart service
 */
export function createGuestCartService(redis: Redis): GuestCartService {
  return new GuestCartService(redis);
}
