# 🚀 Phase 3 Roadmap: Products & Categories

**Current Status:** Phase 2 (Tenant Management) ✅ Complete  
**Next Phase:** Phase 3 (Product Catalog)  
**Estimated Files:** 8–10 new files  
**Estimated LOC:** 2,500–3,000  

---

## Phase 3 Overview

Build the product catalog system: categories, products, image uploads, search/filter, caching.

**In Scope:**
- Category CRUD (per-tenant hierarchical categories)
- Product CRUD (SKU, price, stock, images, tags)
- Image upload → Cloudinary
- Product search (PostgreSQL FTS + pg_trgm)
- Redis cache-aside pattern for catalog
- Stock visibility (low-stock alerts via settings)

**Out of Scope (defer to Phase 4+):**
- Inventory analytics / forecasting
- Product variants (colors, sizes)
- Bulk upload / import
- Search faceting beyond category/price

---

## Architecture (Same Pattern as Phase 2)

### Layer Structure
```
Controller → Service → Repository → Prisma → PostgreSQL
                                   → Redis (cache)
```

### Tenant Isolation
- Every category query includes `where: { tenantId }`
- Every product query includes `where: { tenantId }`
- Store admin can only manage own tenant's products
- `resolveTenant` middleware ensures request has valid `tenantId`

### Authorization Model
```
GET /products              → Public (guest cart visible)
GET /products/:id          → Public (guest can see details)
POST /products             → store_admin only
PATCH /products/:id        → store_admin only
DELETE /products/:id       → store_admin only
PATCH /products/:id/stock  → store_admin only

GET /categories            → Public
POST /categories           → store_admin only
PATCH /categories/:id      → store_admin only
DELETE /categories/:id     → store_admin only
```

---

## Files to Create

### 1. Schemas (Zod Validation)

**File:** `apps/api/src/modules/categories/category.schemas.ts`

```typescript
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
export const listCategoriesQuerySchema = z.object({
  includeInactive: z.boolean().optional(),
});
```

**File:** `apps/api/src/modules/products/product.schemas.ts`

```typescript
export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().optional(),
  sku: z.string().min(1).max(80),
  price: z.number().positive(),
  comparePrice: z.number().optional(),
  stockQuantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(10),
  unit: z.string().default("piece"),
  imageUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();
export const updateProductStockSchema = z.object({
  stockQuantity: z.number().int().nonnegative(),
  reason: z.string().optional(),
});
```

### 2. Repositories

**File:** `apps/api/src/modules/categories/category.repository.ts`
- `createCategory(tenantId, data)`
- `findCategoryById(tenantId, categoryId)`
- `updateCategory(tenantId, categoryId, data)`
- `deleteCategory(tenantId, categoryId)`
- `listCategories(tenantId, options)` with parent filtering
- `isCategorySlugUnique(tenantId, slug)`

**File:** `apps/api/src/modules/products/product.repository.ts`
- `createProduct(tenantId, data)`
- `findProductById(tenantId, productId)`
- `findProductBySku(tenantId, sku)`
- `updateProduct(tenantId, productId, data)`
- `deleteProduct(tenantId, productId)`
- `listProducts(tenantId, options)` with filters + FTS search
- `updateStock(tenantId, productId, quantity, reason)`
- `isSkuUnique(tenantId, sku)`
- `getLowStockProducts(tenantId)`

### 3. Services

**File:** `apps/api/src/modules/categories/category.service.ts`
- `createCategory(tenantId, input, requesterId)`
- `getCategory(tenantId, categoryId)`
- `updateCategory(tenantId, categoryId, input, requesterId)`
- `deleteCategory(tenantId, categoryId, requesterId)`
- `listCategories(tenantId, options)`
- `invalidateCategoryCache(tenantId)`

**File:** `apps/api/src/modules/products/product.service.ts`
- `createProduct(tenantId, input, requesterId)`
- `getProduct(tenantId, productId)`
- `updateProduct(tenantId, productId, input, requesterId)`
- `deleteProduct(tenantId, productId, requesterId)`
- `listProducts(tenantId, options)` with cache check
- `updateStock(tenantId, productId, quantity, reason, requesterId)`
- `getLowStockAlerts(tenantId)`
- `invalidateProductCache(tenantId, productId?)`

### 4. Controllers

**File:** `apps/api/src/modules/categories/category.controller.ts`
- `createCategory`, `getCategory`, `updateCategory`, `deleteCategory`, `listCategories`

**File:** `apps/api/src/modules/products/product.controller.ts`
- `createProduct`, `getProduct`, `updateProduct`, `deleteProduct`, `listProducts`
- `updateStock`, `getLowStockProducts`

### 5. Routes

**File:** `apps/api/src/modules/categories/category.routes.ts`

```
POST   /api/v1/categories                [store_admin]
GET    /api/v1/categories                [public]
GET    /api/v1/categories/:id            [public]
PATCH  /api/v1/categories/:id            [store_admin]
DELETE /api/v1/categories/:id            [store_admin]
```

**File:** `apps/api/src/modules/products/product.routes.ts`

```
POST   /api/v1/products                  [store_admin]
GET    /api/v1/products                  [public]
GET    /api/v1/products/:id              [public]
PATCH  /api/v1/products/:id              [store_admin]
DELETE /api/v1/products/:id              [store_admin]
PATCH  /api/v1/products/:id/stock        [store_admin]
GET    /api/v1/products/low-stock        [store_admin]
```

### 6. Cache Service

**File:** `apps/api/src/services/redis/catalog.cache.ts`

```typescript
export class CatalogCacheService {
  async getProductsList(tenantId, page, limit, filtersHash) { }
  async setProductsList(tenantId, page, limit, filtersHash, data) { }
  async getSingleProduct(tenantId, productId) { }
  async setSingleProduct(tenantId, productId, data) { }
  async getCategories(tenantId) { }
  async setCategories(tenantId, data) { }
  async invalidateProductsCache(tenantId, productId?) { }
  async invalidateCategoriesCache(tenantId) { }
}
```

### 7. Tests

**File:** `apps/api/tests/integration/categories.test.ts`
- CRUD tests (create, read, update, delete)
- Hierarchical parent-child tests
- Slug uniqueness tests
- Tenant isolation tests

**File:** `apps/api/tests/integration/products.test.ts`
- CRUD tests
- Stock management tests
- Search / filter tests (category, price, tags)
- Tenant isolation tests
- Cache invalidation tests

---

## Key Implementation Details

### Hierarchical Categories
Categories can have a `parentId` for subcategories:

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  parent_id UUID REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  CONSTRAINT uq_category_slug_tenant UNIQUE (tenant_id, slug)
);
```

### Product Search (FTS)
PostgreSQL full-text search using `to_tsvector`:

```sql
SELECT id, name, description
FROM products
WHERE tenant_id = $1
  AND to_tsvector('english', name || ' ' || COALESCE(description, '')) 
      @@ plainto_tsquery('english', $2)
  AND is_active = true
ORDER BY ts_rank(...) DESC;

CREATE INDEX idx_products_fts ON products 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description,'')));
```

Cache-aside pattern:
1. Check Redis → HIT return
2. MISS: query PostgreSQL FTS
3. SET cache with 5-min TTL
4. Return

### Stock Management
When stock updated:

```typescript
await this.repository.updateStock(tenantId, productId, newQty, reason);
await auditLog(..., {
  action: "UPDATE_STOCK",
  oldValues: { stockQuantity: oldQty },
  newValues: { stockQuantity: newQty, reason },
});
await catalogCache.invalidateProductsCache(tenantId, productId);
```

Low-stock alerts:
- When stock < `lowStockThreshold`, flag in response
- List endpoint `/products/low-stock` for admin dashboard

### Image Upload Flow
```
Frontend (multipart/form-data) 
  → multer middleware 
  → cloudinary.service.uploadProductImages() 
  → Returns Cloudinary URLs 
  → Save URLs array in product.imageUrls (JSONB)
```

---

## Integration Points

### From Phase 1 (Auth)
- Use `req.user` to get `tenantId` for filtering
- `authorize("store_admin")` middleware to protect admin endpoints

### From Phase 2 (Tenants)
- All queries receive `tenantId` from resolved tenant context
- Store admin can only access own tenant's products

### To Phase 4 (Cart & Orders)
- Product IDs referenced in cart items
- Price snapshot captured in order_items
- Stock checked atomically during order placement

---

## Testing Checklist

### Manual Tests
- [ ] Create category → POST /categories
- [ ] Create product → POST /products with images
- [ ] Search products → verify FTS returns matches
- [ ] Filter by price/category → verify filters work
- [ ] Fetch low-stock products → verify threshold logic
- [ ] Store admin manages other tenant's products → verify 403

### Automated Tests
```bash
npm test -- categories.test.ts products.test.ts
```
Target: 40+ test cases

---

## Summary

Phase 3 builds on Phases 1 & 2 using the same:
- **Tenant isolation pattern** (tenantId in every query)
- **RBAC model** (store_admin vs public)
- **Repository-Service-Controller** layering
- **Error handling** (AppError hierarchy)

**Estimated Timeline:** 3–4 days
**Ready to Start:** When Phase 2 tests all pass ✅
