import { Request, Response } from "express";
import { OrderService } from "./order.service";
import { CreateOrderRequest, UpdateOrderStatusRequest, ListOrdersQuery } from "./order.schemas";
import { sendSuccess } from "@/utils";
import { asyncHandler } from "@/utils";

/**
 * Order controller handling HTTP requests
 */
export class OrderController {
  constructor(private orderService: OrderService) {}

  /**
   * POST /api/v1/orders
   * Create order from current cart
   * Body: { deliveryAddress: { line1, city, state, zipCode }, notes?: string }
   */
  createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const input = req.body as CreateOrderRequest;

    const order = await this.orderService.createOrder(tenantId, userId, input);

    sendSuccess(res, order, 201);
  });

  /**
   * GET /api/v1/orders
   * List orders (customer sees own, admin sees all in tenant)
   * Query: { page?, limit?, status? }
   */
  listOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const role = req.user!.role;
    const query = (req as any).validatedQuery as ListOrdersQuery;

    const result = await this.orderService.listOrders(tenantId, userId, role, query);

    sendSuccess(res, result.orders, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasNextPage: result.page * result.limit < result.total,
    });
  });

  /**
   * GET /api/v1/orders/:id
   * Get order details
   */
  getOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const role = req.user!.role;
    const orderId = (req as any).params.id as string;

    const order = await this.orderService.getOrder(tenantId, orderId, userId, role);

    sendSuccess(res, order, 200);
  });

  /**
   * POST /api/v1/orders/:id/cancel
   * Cancel order (customer: pending only, admin: pending or confirmed)
   * Body: { reason?: string }
   */
  cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const role = req.user!.role;
    const orderId = (req as any).params.id as string;
    const { reason } = req.body as { reason?: string };

    const order = await this.orderService.cancelOrder(
      tenantId,
      orderId,
      userId,
      role,
      reason
    );

    sendSuccess(res, order, 200);
  });

  /**
   * PATCH /api/v1/orders/:id/status
   * Update order status (admin only)
   * Body: { status: OrderStatus, reason?: string }
   */
  updateOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const role = req.user!.role;
    const orderId = (req as any).params.id as string;
    const input = req.body as UpdateOrderStatusRequest;

    const order = await this.orderService.updateOrderStatus(
      tenantId,
      orderId,
      input.status,
      userId,
      role
    );

    sendSuccess(res, order, 200);
  });
}

/**
 * Factory function to create order controller
 */
export function createOrderController(orderService: OrderService): OrderController {
  return new OrderController(orderService);
}
