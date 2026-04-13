import { PrismaClient, OrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { OrderRepository, OrderWithItems } from "./order.repository";
import { CartRepository } from "@/modules/cart/cart.repository";
import { TenantRepository } from "@/modules/tenants/tenant.repository";
import { UnprocessableError, NotFoundError, ForbiddenError } from "@/utils";
import { CreateOrderRequest, UpdateOrderStatusRequest, ListOrdersQuery } from "./order.schemas";

/**
 * Order response for API
 */
export interface OrderResponse {
  id: string;
  tenantId: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  discountAmount: string;
  deliveryFee: string;
  totalAmount: string;
  deliveryAddress: Record<string, any>;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

/**
 * Order service containing business logic
 */
export class OrderService {
  private orderRepo: OrderRepository;
  private cartRepo: CartRepository;
  private tenantRepo: TenantRepository;

  // State machine: valid transitions
  private readonly stateTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  constructor(private prisma: PrismaClient) {
    this.orderRepo = new OrderRepository(prisma);
    this.cartRepo = new CartRepository(prisma);
    this.tenantRepo = new TenantRepository(prisma);
  }

  /**
   * Create order from current cart
   * Validates cart is not empty, reads tenant settings, calls repository
   */
  async createOrder(
    tenantId: string,
    userId: string,
    input: CreateOrderRequest
  ): Promise<OrderResponse> {
    // Get user's cart
    const cart = await this.cartRepo.getCart(tenantId, userId);

    // Validate cart is not empty
    if (!cart || cart.items.length === 0) {
      throw new UnprocessableError("Cannot create order from empty cart");
    }

    // Get tenant for settings
    const tenant = await this.tenantRepo.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant", tenantId);
    }

    // Extract settings
    const settings = tenant.settings as Record<string, any>;
    const orderPrefix: string = settings.orderPrefix ?? "ORD";
    const deliveryFee = new Decimal(settings.deliveryFee ?? 0);

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum.plus(new Decimal(item.subtotal)),
      new Decimal(0)
    );

    const discountAmount = new Decimal(0); // No discount support in v1
    const totalAmount = subtotal.plus(deliveryFee).minus(discountAmount);

    // Generate order number
    const orderNumber = OrderRepository.generateOrderNumber(orderPrefix);

    // Create order atomically
    const orderWithItems = await this.orderRepo.createOrder(tenantId, userId, {
      cartItems: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: new Decimal(item.unitPrice),
        productName: item.product.name,
        productSku: item.product.sku,
      })),
      subtotal,
      discountAmount,
      deliveryFee,
      totalAmount,
      deliveryAddress: input.deliveryAddress,
      notes: input.notes,
      orderNumber,
    });

    return this.formatOrderResponse(orderWithItems);
  }

  /**
   * Get order by ID
   * Customers can only see their own orders
   * Admins can see any order in their tenant
   */
  async getOrder(
    tenantId: string,
    orderId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<OrderResponse> {
    const order = await this.orderRepo.findOrderById(tenantId, orderId);

    // Authorization check
    if (requesterRole === "customer" && order.userId !== requesterId) {
      throw new NotFoundError("Order", orderId);
    }

    return this.formatOrderResponse(order);
  }

  /**
   * List orders
   * Customers see only their own
   * Admins see all in tenant
   */
  async listOrders(
    tenantId: string,
    requesterId: string,
    requesterRole: string,
    opts: ListOrdersQuery
  ): Promise<{
    orders: OrderResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    let result;

    if (requesterRole === "customer") {
      result = await this.orderRepo.findOrdersByUser(tenantId, requesterId, {
        page: opts.page,
        limit: opts.limit,
        status: opts.status,
      });
    } else {
      result = await this.orderRepo.findAllOrders(tenantId, {
        page: opts.page,
        limit: opts.limit,
        status: opts.status,
      });
    }

    return {
      orders: result.orders.map((order) => this.formatOrderResponse(order)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Cancel order
   * Customer can cancel only pending orders
   * Admin can cancel pending or confirmed orders
   * Restores stock on cancel
   */
  async cancelOrder(
    tenantId: string,
    orderId: string,
    requesterId: string,
    requesterRole: string,
    reason?: string
  ): Promise<OrderResponse> {
    const order = await this.orderRepo.findOrderById(tenantId, orderId);

    // Authorization check
    if (requesterRole === "customer") {
      if (order.userId !== requesterId) {
        throw new NotFoundError("Order", orderId);
      }
      // Customers can only cancel pending orders
      if (order.status !== "pending") {
        throw new UnprocessableError("Cannot cancel non-pending order");
      }
    } else if (requesterRole === "store_admin") {
      // Admins can cancel pending or confirmed orders
      if (order.status !== "pending" && order.status !== "confirmed") {
        throw new UnprocessableError(
          `Cannot cancel ${order.status} order. Only pending or confirmed orders can be cancelled.`
        );
      }
    }

    // Restore stock
    await this.orderRepo.restoreStockForOrder(tenantId, orderId);

    // Update status to cancelled
    const updatedOrder = await this.orderRepo.updateOrderStatus(
      tenantId,
      orderId,
      "cancelled",
      reason
    );

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Update order status
   * Only store_admin can change status
   * Must follow state machine rules
   */
  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    newStatus: OrderStatus,
    requesterId: string,
    requesterRole: string
  ): Promise<OrderResponse> {
    // Only store_admin can change status
    if (requesterRole !== "store_admin") {
      throw new ForbiddenError("Only store admins can change order status");
    }

    const order = await this.orderRepo.findOrderById(tenantId, orderId);
    const currentStatus = order.status as OrderStatus;

    // Validate state transition
    const allowedTransitions = this.stateTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableError(
        `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.join(", ")}`
      );
    }

    // Update status
    const updatedOrder = await this.orderRepo.updateOrderStatus(
      tenantId,
      orderId,
      newStatus
    );

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Format order for API response
   */
  private formatOrderResponse(order: OrderWithItems): OrderResponse {
    return {
      id: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal.toString(),
      discountAmount: order.discountAmount.toString(),
      deliveryFee: order.deliveryFee.toString(),
      totalAmount: order.totalAmount.toString(),
      deliveryAddress: order.deliveryAddress as Record<string, any>,
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      createdAt: order.createdAt.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
    };
  }
}

/**
 * Factory function to create order service
 */
export function createOrderService(prisma: PrismaClient): OrderService {
  return new OrderService(prisma);
}
