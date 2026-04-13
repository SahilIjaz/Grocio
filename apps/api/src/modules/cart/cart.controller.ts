import { Request, Response } from "express";
import { CartService } from "./cart.service";
import { AddItemRequest, UpdateItemRequest, MergeCartRequest } from "./cart.schemas";
import { sendSuccess, sendCreated } from "@/utils";
import { asyncHandler } from "@/utils";

/**
 * Cart controller handling HTTP requests
 */
export class CartController {
  constructor(private cartService: CartService) {}

  /**
   * GET /api/v1/cart
   * Get current user's cart
   */
  getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;

    const cart = await this.cartService.getCart(tenantId, userId);

    sendSuccess(res, cart, 200);
  });

  /**
   * POST /api/v1/cart/items
   * Add item to cart
   * Body: { productId: string, quantity: number }
   */
  addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const { productId, quantity } = req.body as AddItemRequest;

    const cart = await this.cartService.addItem(
      tenantId,
      userId,
      productId,
      quantity
    );

    sendSuccess(res, cart, 200);
  });

  /**
   * PATCH /api/v1/cart/items/:productId
   * Update item quantity
   * Body: { quantity: number }
   */
  updateItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const productId = (req as any).params.productId as string;
    const { quantity } = req.body as UpdateItemRequest;

    const cart = await this.cartService.updateItem(
      tenantId,
      userId,
      productId,
      quantity
    );

    sendSuccess(res, cart, 200);
  });

  /**
   * DELETE /api/v1/cart/items/:productId
   * Remove item from cart
   */
  removeItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const productId = (req as any).params.productId as string;

    const cart = await this.cartService.removeItem(tenantId, userId, productId);

    sendSuccess(res, cart, 200);
  });

  /**
   * DELETE /api/v1/cart
   * Clear all items from cart
   */
  clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;

    const cart = await this.cartService.clearCart(tenantId, userId);

    sendSuccess(res, cart, 200);
  });

  /**
   * POST /api/v1/cart/merge
   * Merge guest cart into authenticated user's cart
   * Body: { guestId: string }
   */
  mergeCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.tenantId!;
    const userId = req.user!.sub;
    const { guestId } = req.body as MergeCartRequest;

    const cart = await this.cartService.mergeCart(tenantId, userId, guestId);

    sendSuccess(res, cart, 200);
  });
}

/**
 * Factory function to create cart controller
 */
export function createCartController(cartService: CartService): CartController {
  return new CartController(cartService);
}
