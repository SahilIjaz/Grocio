import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { OrderController, createOrderController } from "./order.controller";
import { OrderService, createOrderService } from "./order.service";
import { authorize, validate, validateQuery } from "@/middleware";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuerySchema,
} from "./order.schemas";

/**
 * Create order router
 * All routes require authentication
 *
 * Routes:
 *   POST   /                 Create order from cart
 *   GET    /                 List orders (customer: own, admin: all)
 *   GET    /:id              Get order details
 *   POST   /:id/cancel       Cancel order
 *   PATCH  /:id/status       Update status (admin only)
 *
 * @param prisma Prisma client
 * @returns Express router
 */
export function createOrderRouter(prisma: PrismaClient): Router {
  const router = Router();

  const orderService = createOrderService(prisma);
  const orderController = createOrderController(orderService);

  /**
   * POST /api/v1/orders
   * Create order from current cart
   * Required: authenticated (customer or store_admin)
   *
   * @body {object} deliveryAddress - Shipping address { line1, city, state, zipCode }
   * @body {string} notes - Optional order notes
   * @returns {object} Created order with items and calculated totals
   * @throws 400 if validation fails
   * @throws 422 if cart is empty or insufficient stock
   * @throws 401 if unauthenticated
   *
   * @example
   * POST /api/v1/orders
   * Authorization: Bearer <accessToken>
   * Content-Type: application/json
   *
   * {
   *   "deliveryAddress": {
   *     "line1": "123 Main Street",
   *     "city": "Springfield",
   *     "state": "Illinois",
   *     "zipCode": "62701"
   *   },
   *   "notes": "Leave at door"
   * }
   *
   * 201 Created
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "orderNumber": "ORD-1A2B3C",
   *     "status": "pending",
   *     "subtotal": "29.97",
   *     "deliveryFee": "5.00",
   *     "totalAmount": "34.97",
   *     "items": [ ... ]
   *   }
   * }
   */
  router.post(
    "/",
    authorize("store_admin", "customer"),
    validate(createOrderSchema),
    orderController.createOrder
  );

  /**
   * GET /api/v1/orders
   * List orders with pagination
   * Customer sees only their own orders
   * Store admin sees all orders in their tenant
   *
   * @query {number} page - Page number (default 1)
   * @query {number} limit - Items per page (default 10, max 100)
   * @query {string} status - Filter by status (pending|confirmed|processing|shipped|delivered|cancelled)
   * @returns {array} Orders array with pagination metadata
   *
   * @example
   * GET /api/v1/orders?page=1&limit=10&status=pending
   * Authorization: Bearer <accessToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": [ ... orders ... ],
   *   "meta": { "page": 1, "limit": 10, "total": 25, "hasNextPage": true }
   * }
   */
  router.get(
    "/",
    authorize("store_admin", "customer"),
    validateQuery(listOrdersQuerySchema),
    orderController.listOrders
  );

  /**
   * GET /api/v1/orders/:id
   * Get order details
   * Customer can only see their own orders
   * Store admin can see any order in their tenant
   *
   * @param {string} id - Order ID (UUID)
   * @returns {object} Order with items and timeline
   * @throws 404 if order not found or unauthorized
   *
   * @example
   * GET /api/v1/orders/550e8400-e29b-41d4-a716-446655440000
   * Authorization: Bearer <accessToken>
   *
   * 200 OK
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "orderNumber": "ORD-1A2B3C",
   *     "status": "confirmed",
   *     "items": [ ... ],
   *     "createdAt": "...",
   *     "confirmedAt": "..."
   *   }
   * }
   */
  router.get(
    "/:id",
    authorize("store_admin", "customer"),
    orderController.getOrder
  );

  /**
   * POST /api/v1/orders/:id/cancel
   * Cancel order
   * Customer can only cancel pending orders
   * Store admin can cancel pending or confirmed orders
   * Automatically restores product stock
   *
   * @param {string} id - Order ID (UUID)
   * @body {string} reason - Optional cancellation reason (max 200 chars)
   * @returns {object} Updated order with cancelled status
   * @throws 404 if order not found
   * @throws 403 if unauthorized
   * @throws 422 if cannot cancel in current state
   *
   * @example
   * POST /api/v1/orders/550e8400-e29b-41d4-a716-446655440000/cancel
   * Authorization: Bearer <accessToken>
   * Content-Type: application/json
   *
   * { "reason": "Changed my mind" }
   *
   * 200 OK
   * { "success": true, "data": { "status": "cancelled", "cancelledAt": "..." } }
   */
  router.post(
    "/:id/cancel",
    authorize("store_admin", "customer"),
    orderController.cancelOrder
  );

  /**
   * PATCH /api/v1/orders/:id/status
   * Update order status (admin only)
   * Follows strict state machine:
   *   pending → confirmed | cancelled
   *   confirmed → processing | cancelled
   *   processing → shipped
   *   shipped → delivered
   *   delivered/cancelled → (terminal, no transitions)
   *
   * @param {string} id - Order ID (UUID)
   * @body {string} status - New status
   * @body {string} reason - Optional reason for transition
   * @returns {object} Updated order with new status and timestamp
   * @throws 404 if order not found
   * @throws 403 if not store_admin
   * @throws 422 if invalid state transition
   *
   * @example
   * PATCH /api/v1/orders/550e8400-e29b-41d4-a716-446655440000/status
   * Authorization: Bearer <storeAdminToken>
   * Content-Type: application/json
   *
   * { "status": "confirmed", "reason": "Payment verified" }
   *
   * 200 OK
   * { "success": true, "data": { "status": "confirmed", "confirmedAt": "..." } }
   */
  router.patch(
    "/:id/status",
    authorize("store_admin"),
    validate(updateOrderStatusSchema),
    orderController.updateOrderStatus
  );

  return router;
}

export default createOrderRouter;
