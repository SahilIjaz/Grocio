import {
  PrismaClient,
  Order,
  OrderItem,
  Prisma,
  OrderStatus,
  AuditAction,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { UnprocessableError, NotFoundError } from "@/utils";
import { DeliveryAddress } from "./order.schemas";

/**
 * Order with items
 */
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Order repository for database operations
 * All queries are scoped to tenantId for data isolation
 */
export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create an order atomically:
   * 1. Validate cart is not empty
   * 2. Re-read all products and validate stock
   * 3. Decrement stock for each product
   * 4. Create Order record
   * 5. Create OrderItem records (snapshots)
   * 6. Clear cart items
   * Returns the created order with items
   */
  async createOrder(
    tenantId: string,
    userId: string,
    input: {
      cartItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: Decimal;
        productName: string;
        productSku: string;
      }>;
      subtotal: Decimal;
      discountAmount: Decimal;
      deliveryFee: Decimal;
      totalAmount: Decimal;
      deliveryAddress: DeliveryAddress;
      notes?: string;
      orderNumber: string;
    }
  ): Promise<OrderWithItems> {
    // Execute atomic transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Re-read products and validate stock
      const productIds = input.cartItems.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
        },
      });

      // Validate all products exist
      if (products.length !== productIds.length) {
        throw new NotFoundError("One or more products not found");
      }

      // Build map of products for quick lookup
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate stock for each item
      for (const item of input.cartItems) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new NotFoundError("Product", item.productId);
        }
        if (product.stockQuantity < item.quantity) {
          throw new UnprocessableError("Insufficient stock", {
            productId: item.productId,
            productName: product.name,
            available: product.stockQuantity,
            requested: item.quantity,
          });
        }
      }

      // 2. Decrement stock for each product
      for (const item of input.cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        // Log stock update to audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: userId,
            action: AuditAction.STOCK_UPDATE,
            entityType: "product",
            entityId: item.productId,
            newValues: {
              stockQuantity: productMap.get(item.productId)!.stockQuantity - item.quantity,
            },
          },
        });
      }

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          tenantId,
          userId,
          orderNumber: input.orderNumber,
          status: "pending" as OrderStatus,
          subtotal: input.subtotal,
          discountAmount: input.discountAmount,
          deliveryFee: input.deliveryFee,
          totalAmount: input.totalAmount,
          deliveryAddress: input.deliveryAddress as any, // Prisma Json type
          notes: input.notes || null,
        },
      });

      // 4. Create OrderItems (snapshots)
      const orderItems = await tx.orderItem.createMany({
        data: input.cartItems.map((item) => ({
          orderId: order.id,
          tenantId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice.mul(item.quantity),
        })),
      });

      // 5. Clear cart items
      const cart = await tx.cart.findFirst({
        where: {
          tenantId,
          userId,
        },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            tenantId,
          },
        });
      }

      // 6. Log order creation
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          action: AuditAction.CREATE,
          entityType: "order",
          entityId: order.id,
          newValues: {
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount.toString(),
          },
        },
      });

      return order;
    });

    // Fetch the created order with items
    return await this.getOrderWithItems(tenantId, order.id);
  }

  /**
   * Get order by ID with items
   */
  async findOrderById(tenantId: string, orderId: string): Promise<OrderWithItems | null> {
    return await this.getOrderWithItems(tenantId, orderId);
  }

  /**
   * Get orders for a specific user (paginated)
   */
  async findOrdersByUser(
    tenantId: string,
    userId: string,
    opts: {
      page: number;
      limit: number;
      status?: string;
    }
  ): Promise<{
    orders: OrderWithItems[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (opts.page - 1) * opts.limit;
    const where: Prisma.OrderWhereInput = {
      tenantId,
      userId,
      ...(opts.status && { status: opts.status as OrderStatus }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: opts.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders as OrderWithItems[],
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  /**
   * Get all orders for a tenant (admin view, paginated)
   */
  async findAllOrders(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      status?: string;
    }
  ): Promise<{
    orders: OrderWithItems[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (opts.page - 1) * opts.limit;
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(opts.status && { status: opts.status as OrderStatus }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: opts.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders as OrderWithItems[],
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  /**
   * Update order status and set corresponding timestamp
   */
  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    status: OrderStatus,
    reason?: string
  ): Promise<OrderWithItems> {
    // Build update data based on status
    const updateData: Prisma.OrderUpdateInput = {
      status,
    };

    switch (status) {
      case "confirmed":
        updateData.confirmedAt = new Date();
        break;
      case "processing":
        break; // No timestamp
      case "shipped":
        updateData.shippedAt = new Date();
        break;
      case "delivered":
        updateData.deliveredAt = new Date();
        break;
      case "cancelled":
        updateData.cancelledAt = new Date();
        if (reason) {
          updateData.cancelledReason = reason;
        }
        break;
    }

    await this.prisma.order.updateMany({
      where: {
        id: orderId,
        tenantId,
      },
      data: updateData,
    });

    // Log status change
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: AuditAction.ORDER_STATUS_CHANGE,
        entityType: "order",
        entityId: orderId,
        newValues: {
          status,
          reason,
        },
      },
    });

    return await this.getOrderWithItems(tenantId, orderId);
  }

  /**
   * Restore stock for a cancelled order
   * Used in transaction context during cancel operation
   */
  async restoreStockForOrder(
    tenantId: string,
    orderId: string
  ): Promise<void> {
    // Get order items
    const items = await this.prisma.orderItem.findMany({
      where: {
        orderId,
        tenantId,
      },
    });

    // Restore stock for each item using transaction
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });

        // Log stock restoration
        await tx.auditLog.create({
          data: {
            tenantId,
            action: AuditAction.STOCK_UPDATE,
            entityType: "product",
            entityId: item.productId,
            newValues: {
              stockQuantity_change: `+${item.quantity} (order cancelled)`,
            },
          },
        });
      }
    });
  }

  /**
   * Helper: Get order with items included
   */
  private async getOrderWithItems(
    tenantId: string,
    orderId: string
  ): Promise<OrderWithItems> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    return order as OrderWithItems;
  }

  /**
   * Helper: Generate order number
   */
  static generateOrderNumber(orderPrefix: string): string {
    // Format: PREFIX-TIMESTAMP-RANDOM
    // Example: ORD-1A2B3C4D5E
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${orderPrefix}-${timestamp.slice(-4)}${random}`;
  }
}

/**
 * Factory function to create order repository
 */
export function createOrderRepository(prisma: PrismaClient): OrderRepository {
  return new OrderRepository(prisma);
}
