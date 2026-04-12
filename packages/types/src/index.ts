// User Types
export type UserRole = "super_admin" | "store_admin" | "customer";
export type TenantStatus = "active" | "suspended" | "pending";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export interface Category {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  imageUrls: string[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Cart Types
export interface CartItem {
  id: string;
  cartId: string;
  tenantId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: string;
  tenantId: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Order Types
export interface OrderItem {
  id: string;
  orderId: string;
  tenantId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}

export interface Order {
  id: string;
  tenantId: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress: {
    line1?: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  notes: string | null;
  cancelledReason: string | null;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  items?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface JWTPayload {
  sub: string;
  tenantId: string | null;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
  jti: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  } | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}
