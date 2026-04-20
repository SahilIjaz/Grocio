# 🎯 GROCIO - Complete Project Deep Dive Explanation

## Table of Contents
1. [Project Type & Overview](#project-type--overview)
2. [Multi-Tenant Architecture Explained](#multi-tenant-architecture-explained)
3. [System Architecture Diagram](#system-architecture-diagram)
4. [Data Flow & Token Management](#data-flow--token-management)
5. [Database Schema Explained](#database-schema-explained)
6. [Tech Stack Breakdown](#tech-stack-breakdown)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Endpoints & Flows](#api-endpoints--flows)
9. [Frontend Architecture](#frontend-architecture)
10. [Deployment & DevOps](#deployment--devops)

---

## 1. PROJECT TYPE & OVERVIEW

### What Type of Project is Grocio?

**Grocio is a SaaS (Software-as-a-Service) Multi-Tenant E-Commerce Platform**

#### Project Classification:
```
├─ Platform Type: SaaS (Cloud-based Software)
├─ Business Model: Multi-Tenant (One app, Multiple independent stores)
├─ Industry: Grocery/Food Delivery E-Commerce
├─ Architecture: Full-Stack Web Application
└─ Scalability: Horizontal & Vertical
```

### What Problem Does It Solve?

**Without Grocio:**
- Each grocery store needs its own website & backend
- Expensive to maintain multiple systems
- Complex inventory management
- No unified platform

**With Grocio:**
- One platform hosts MULTIPLE grocery stores
- Each store has complete independence
- Centralized management
- Shared infrastructure = cost-effective
- Similar to: Shopify (for stores), UberEats (for restaurants)

### Real-World Analogy

```
Think of it like a Shopping Mall:

Mall = Grocio Platform
Shop A = Tenant 1 (Store Owner A)
Shop B = Tenant 2 (Store Owner B)
Shop C = Tenant 3 (Store Owner C)

Each shop:
✓ Has its own products (inventory)
✓ Has its own customers
✓ Has its own sales/orders
✗ CANNOT see other shops' data
✗ Shares building infrastructure (servers, database)
```

---

## 2. MULTI-TENANT ARCHITECTURE EXPLAINED

### What is Multi-Tenant?

**Single-Tenant (Traditional):**
```
Company A  →  Server A  →  Database A
Company B  →  Server B  →  Database B
Company C  →  Server C  →  Database C

❌ Expensive (3 servers, 3 databases)
❌ Hard to maintain
❌ Wasted resources
```

**Multi-Tenant (Grocio):**
```
Company A  ┐
Company B  ├──  Single Server  ──  Single Database (with data isolation)
Company C  ┘

✅ Cost-effective (1 server, 1 database)
✅ Easy to maintain
✅ Efficient resource usage
✅ Auto-scaling benefits
```

### How Grocio Implements Multi-Tenancy

#### 1. **Data Isolation (The Key Concept)**

Every table in the database has a `tenantId` field:

```sql
-- Tenant 1 (Fresh Market Store)
SELECT * FROM Product WHERE tenantId = 'tenant-1-uuid';
Result: Apple, Orange, Banana (Fresh Market's products)

-- Tenant 2 (Green Groceries Store)
SELECT * FROM Product WHERE tenantId = 'tenant-2-uuid';
Result: Lettuce, Carrot, Broccoli (Green Groceries' products)

🔒 Even though they use the same database, 
   the data is completely isolated!
```

#### 2. **Tenant Identification**

How does the system know which tenant is accessing?

**Method: URL Slug-Based**

```
Route 1: /store/fresh-market
         └─ slug = "fresh-market" → maps to tenant-1

Route 2: /store/green-groceries
         └─ slug = "green-groceries" → maps to tenant-2

Backend receives slug → looks up tenantId → filters data by tenantId
```

#### 3. **Data Flow with Tenant Isolation**

```
User visits: https://app.com/store/fresh-market

┌─────────────────────────────────────────────────┐
│ 1. Frontend extracts slug: "fresh-market"       │
└──────────────────────────────┬──────────────────┘
                               │
┌──────────────────────────────▼──────────────────┐
│ 2. API call: /api/v1/tenants/fresh-market/...  │
└──────────────────────────────┬──────────────────┘
                               │
┌──────────────────────────────▼──────────────────┐
│ 3. Backend receives slug                        │
│    ├─ Looks up: Tenant.findUnique({             │
│    │   where: { slug: "fresh-market" }          │
│    │ })                                         │
│    └─ Returns: tenantId = "abc-123-def"        │
└──────────────────────────────┬──────────────────┘
                               │
┌──────────────────────────────▼──────────────────┐
│ 4. Query database with tenantId                 │
│    SELECT * FROM Product                        │
│    WHERE tenantId = "abc-123-def"               │
│    (Only Fresh Market's products returned)      │
└──────────────────────────────┬──────────────────┘
                               │
┌──────────────────────────────▼──────────────────┐
│ 5. Frontend receives data and displays          │
└─────────────────────────────────────────────────┘
```

#### 4. **Complete Data Isolation Example**

```
Database State:
┌─────────────────────────────────────────────────────┐
│ Tenant Table                                        │
├─────┬──────────────────┬───────────────────────────┤
│ ID  │ Name             │ Slug                      │
├─────┼──────────────────┼───────────────────────────┤
│ T1  │ Fresh Market     │ fresh-market              │
│ T2  │ Green Groceries  │ green-groceries           │
└─────┴──────────────────┴───────────────────────────┘

Product Table:
┌──────┬──────────┬─────────┬──────────────┐
│ ID   │ Name     │ Price   │ TenantId     │
├──────┼──────────┼─────────┼──────────────┤
│ P1   │ Apple    │ $2      │ T1           │
│ P2   │ Orange   │ $3      │ T1           │
│ P3   │ Lettuce  │ $1.5    │ T2           │
│ P4   │ Carrot   │ $1      │ T2           │
└──────┴──────────┴─────────┴──────────────┘

User (T1 Owner) Query:
SELECT * FROM Product WHERE tenantId = 'T1'
→ Returns: Apple, Orange ONLY ✓

User (T2 Owner) Query:
SELECT * FROM Product WHERE tenantId = 'T2'
→ Returns: Lettuce, Carrot ONLY ✓

🔒 Even with access to same database, 
   each tenant sees only their data!
```

### Types of Multi-Tenancy

Grocio uses **Database-Level Multi-Tenancy**:

```
Type 1: Database-per-Tenant (❌ NOT Grocio)
┌──────────────────┐
│ Tenant 1 DB      │
├──────────────────┤
│ Tenant 2 DB      │
├──────────────────┤
│ Tenant 3 DB      │
└──────────────────┘
❌ Expensive, hard to manage

Type 2: Schema-per-Tenant (❌ NOT Grocio)
┌──────────────────────────┐
│ Shared Database          │
├──────────────────────────┤
│ └─ Tenant 1 Schema       │
│ └─ Tenant 2 Schema       │
│ └─ Tenant 3 Schema       │
└──────────────────────────┘
❌ Complex migrations

Type 3: Row-Level Tenancy (✅ GROCIO)
┌──────────────────────────┐
│ Shared Database          │
├──────────────────────────┤
│ All tables with tenantId │
│ (Complete isolation via  │
│  WHERE tenantId = 'T1')  │
└──────────────────────────┘
✅ Most cost-effective
✅ Easiest to manage
✅ What Grocio uses
```

---

## 3. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                         GROCIO ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │   USERS (Frontend)      │
                    │  Store Owners/Customers │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
         ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼─────┐
         │   Fresh    │  │   Green    │  │   Organic  │
         │   Market   │  │  Groceries │  │   Produce  │
         └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
                │                │                │
                │         (Multiple Stores)       │
                │                │                │
         ┌──────┴────────────────┴────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────┐
    │     NEXTJS FRONTEND (SSR, CSR)          │
    │  - Pages: Home, Store, Cart, Auth       │
    │  - Mobile hamburger menu (responsive)   │
    │  - Responsive design (320px to 4K)      │
    └────────────┬────────────────────────────┘
                 │
         ┌───────┴───────┐
         │   (REST API)  │
         ▼               ▼
    ┌─────────────────────────────────────────┐
    │      EXPRESS.JS BACKEND API             │
    │  - Routes: /api/v1/tenants/*            │
    │  - Authentication (JWT)                 │
    │  - Authorization (Role-based)           │
    │  - Tenant Isolation (tenantId filter)   │
    └────────────┬─────────────┬──────────────┘
                 │             │
         ┌───────┴─────┐   ┌───┴────────┐
         │             │   │            │
         ▼             ▼   ▼            ▼
    ┌─────────┐  ┌──────────┐  ┌────────────┐
    │PostgresQL│  │  Redis   │  │ Cloudinary │
    │Database  │  │ Caching  │  │Images      │
    │(Neon)    │  │          │  │Storage     │
    └─────────┘  └──────────┘  └────────────┘

    ┌─────────────────────────────────────────┐
    │         DEPLOYMENT INFRASTRUCTURE       │
    │  AWS EC2 (Backend) + Nginx (Reverse Proxy)
    │  GitHub Actions (CI/CD Pipeline)        │
    │  Environment: Ubuntu 24.04              │
    └─────────────────────────────────────────┘
```

---

## 4. DATA FLOW & TOKEN MANAGEMENT

### A. Authentication Flow

```
┌─────────────────────────────────────────────────┐
│ USER SIGNUP/LOGIN FLOW                          │
└─────────────────────────────────────────────────┘

USER SIGNUP:
1. User enters email & password on /auth/signup
2. Frontend sends POST to: /api/v1/auth/signup
3. Backend receives request:
   ├─ Validates email format
   ├─ Checks if email already exists (per tenant)
   ├─ Hashes password using bcrypt
   │  Password: "MySecurePass123"
   │  Hashed: "$2b$10$xyz...encrypted...hash"
   │  (One-way encryption - can't reverse)
   ├─ Creates User record:
   │  {
   │    id: uuid(),
   │    tenantId: tenant-uuid,
   │    email: "user@example.com",
   │    passwordHash: "$2b$10$...",
   │    role: "customer",
   │    isActive: true
   │  }
   └─ Returns JWT token

JWT TOKEN STRUCTURE:
┌────────────────────────────────────────────┐
│ Header  │ Payload             │ Signature  │
├─────────┼─────────────────────┼────────────┤
│Algorithm│ {                   │ Secret key │
│ HS256   │   userId: "abc123"  │ encoded    │
│         │   email: "user@..." │            │
│         │   role: "customer"  │            │
│         │   tenantId: "tenant│            │
│         │   iat: 1234567890   │            │
│         │ }                   │            │
└────────────────────────────────────────────┘

Format: eyJhbGc...payload...signature

Frontend stores in localStorage:
localStorage.setItem('authToken', token);

USER LOGIN:
1. User enters credentials on /auth/login
2. Frontend sends: /api/v1/auth/login
3. Backend:
   ├─ Finds user by email
   ├─ Compares password hash:
   │  bcrypt.compare(inputPassword, storedHash)
   ├─ If match → generates JWT
   └─ Returns token

SUBSEQUENT REQUESTS (With Auth):
1. Frontend includes token in header:
   Authorization: Bearer eyJhbGc...
2. Backend middleware extracts token:
   const token = headers.authorization.split(' ')[1];
3. Verifies token:
   jwt.verify(token, SECRET_KEY)
   ├─ If valid → Continues
   ├─ Checks tenantId from payload
   ├─ Ensures user can access only their tenant
   └─ If invalid → Returns 401 Unauthorized
```

### B. Complete Request-Response Flow

```
┌──────────────────────────────────────────────────┐
│ USER ADDS ITEM TO CART FLOW                      │
└──────────────────────────────────────────────────┘

STEP 1: Frontend Action
┌──────────────────────────────────────┐
│ User clicks "Add to Cart"            │
│ Product ID: prod-123                 │
│ Store Slug: fresh-market             │
│ Quantity: 2                          │
└──────────────────────────────────────┘
                ↓

STEP 2: Frontend Sends Request
┌──────────────────────────────────────────────────┐
│ POST /api/v1/tenants/fresh-market/cart/items    │
│                                                  │
│ Headers:                                         │
│ Authorization: Bearer eyJhbGc...                │
│ Content-Type: application/json                  │
│                                                  │
│ Body:                                            │
│ {                                                │
│   "productId": "prod-123",                       │
│   "quantity": 2                                  │
│ }                                                │
└──────────────────────────────────────────────────┘
                ↓

STEP 3: Backend Receives & Validates
┌──────────────────────────────────────────────────┐
│ 3a. Extract Information                          │
│     ├─ slug = "fresh-market" (from URL)         │
│     ├─ token = "eyJhbGc..." (from header)       │
│     └─ body = { productId, quantity }           │
│                                                  │
│ 3b. Verify Token                                │
│     ├─ jwt.verify(token, SECRET_KEY)            │
│     ├─ Extract: userId, tenantId, role         │
│     ├─ If invalid → return 401                  │
│     └─ Continue...                              │
│                                                  │
│ 3c. Verify Tenant Access                        │
│     ├─ Look up tenant by slug:                  │
│     │  Tenant.findUnique({slug: "fresh-market"})│
│     ├─ Get tenantId from DB                     │
│     ├─ Compare with token.tenantId              │
│     ├─ If mismatch → return 403 Forbidden      │
│     └─ Continue...                              │
│                                                  │
│ 3d. Verify Product Belongs to Tenant            │
│     ├─ Product.findUnique({                     │
│     │   where: { id: "prod-123" }               │
│     │ })                                        │
│     ├─ Check: product.tenantId == token.tenant │
│     ├─ If no match → return 404                 │
│     └─ Continue...                              │
│                                                  │
│ 3e. Check Stock                                 │
│     ├─ If quantity > product.stockQuantity      │
│     ├─ Return 400 Bad Request                   │
│     └─ Continue...                              │
└──────────────────────────────────────────────────┘
                ↓

STEP 4: Update Database
┌──────────────────────────────────────────────────┐
│ 4a. Find or Create Cart                          │
│     Cart.upsert({                                │
│       where: { userId: "user-123" },             │
│       create: {                                  │
│         userId: "user-123",                      │
│         tenantId: "tenant-abc"  ← Isolation     │
│       },                                         │
│       update: {}                                 │
│     })                                           │
│                                                  │
│ 4b. Add Item to Cart                            │
│     CartItem.create({                           │
│       cartId: "cart-456",                        │
│       tenantId: "tenant-abc",  ← Isolation      │
│       productId: "prod-123",                     │
│       quantity: 2,                               │
│       unitPrice: 5.99,                           │
│       createdAt: now()                           │
│     })                                           │
│                                                  │
│ 4c. Update Product Stock (Optional)              │
│     Product.update({                            │
│       where: { id: "prod-123" },                 │
│       data: {                                    │
│         stockQuantity: oldStock - 2              │
│       }                                          │
│     })                                           │
└──────────────────────────────────────────────────┘
                ↓

STEP 5: Backend Returns Response
┌──────────────────────────────────────────────────┐
│ HTTP 201 Created                                 │
│                                                  │
│ Response Body:                                   │
│ {                                                │
│   "success": true,                               │
│   "data": {                                       │
│     "cartItem": {                                │
│       "id": "item-789",                          │
│       "productId": "prod-123",                   │
│       "quantity": 2,                             │
│       "unitPrice": 5.99,                         │
│       "createdAt": "2026-04-20T..."             │
│     },                                           │
│     "cart": {                                    │
│       "id": "cart-456",                          │
│       "itemCount": 3,                            │
│       "totalAmount": 29.95                       │
│     }                                            │
│   },                                             │
│   "message": "Item added to cart"               │
│ }                                                │
└──────────────────────────────────────────────────┘
                ↓

STEP 6: Frontend Updates UI
┌──────────────────────────────────────────────────┐
│ 6a. Update State                                 │
│     setCart({...cart, items: [..., newItem]})   │
│                                                  │
│ 6b. Update UI                                   │
│     ├─ Show "Item added to cart" toast          │
│     ├─ Update cart badge count to 3             │
│     ├─ Update total to $29.95                   │
│     └─ Keep button as "Update Cart" for next    │
│                                                  │
│ 6c. Save to localStorage (Backup)               │
│     localStorage.setItem('cart_fresh-market',   │
│       JSON.stringify(cart))                     │
└──────────────────────────────────────────────────┘
```

### C. Token Lifecycle

```
┌──────────────────────────────────────────┐
│ TOKEN LIFECYCLE IN GROCIO                │
└──────────────────────────────────────────┘

1. GENERATION (Login)
   User: "I'm user@example.com with password X"
   Backend: Verifies → Creates JWT
   Token contains:
   {
     userId: "user-123",
     tenantId: "tenant-abc",
     email: "user@example.com",
     role: "customer",
     iat: 1713600000,
     exp: 1713686400  ← Expires in 24 hours
   }

2. STORAGE (Frontend)
   localStorage['authToken'] = token
   Browser keeps it for future requests

3. USAGE (Every Request)
   User makes request: GET /api/v1/tenants/fresh-market/products
   Header: Authorization: Bearer <token>
   Backend checks:
   ├─ Is token valid signature?
   ├─ Is token expired?
   ├─ Do tenantId and userId match?
   └─ Does user have permission?

4. EXPIRATION
   After 24 hours:
   ├─ Token expires (iat + exp)
   ├─ Next request fails with 401 Unauthorized
   ├─ Frontend redirects to login
   └─ User must login again

5. REFRESH (Optional Feature)
   Instead of re-login:
   ├─ Frontend sends refresh token
   ├─ Backend generates new access token
   └─ User continues without re-login
   (Not implemented in current version)

6. LOGOUT
   User clicks logout:
   ├─ Frontend deletes localStorage token
   ├─ Next requests won't include token
   ├─ Backend rejects with 401
   └─ User must login again
```

---

## 5. DATABASE SCHEMA EXPLAINED

### Core Tables & Relationships

```
TENANT (Store Owner's Business)
├─ id: UUID (unique identifier)
├─ name: "Fresh Market" (store name)
├─ slug: "fresh-market" (URL-friendly)
├─ status: "active" | "pending" | "suspended"
├─ logoUrl: URL to store logo
├─ contactEmail: Store owner email
└─ createdAt, updatedAt

    ↓ One Tenant Has Many...

    USER (Store Staff & Customers)
    ├─ id: UUID
    ├─ tenantId: Foreign Key → Tenant
    │  (Ensures isolation - can only see users of their tenant)
    ├─ email: "user@example.com"
    ├─ passwordHash: bcrypt hash (never plain password!)
    ├─ role: "super_admin" | "store_owner" | "staff" | "customer"
    ├─ isActive: true/false
    └─ lastLoginAt: Track logins

    PRODUCT (Store's Inventory)
    ├─ id: UUID
    ├─ tenantId: Foreign Key → Tenant
    │  (Each product belongs to ONE store)
    ├─ categoryId: Foreign Key → Category
    ├─ name: "Apple - Fresh Red"
    ├─ sku: "APPLE-001" (Stock Keeping Unit)
    ├─ price: $2.99
    ├─ comparePrice: $3.99 (original price for discount display)
    ├─ costPrice: $1.50 (store's cost)
    ├─ stockQuantity: 500
    ├─ unit: "kg" | "pc" | "liter"
    ├─ imageUrls: JSON array of image URLs (Cloudinary)
    ├─ isFeatured: Highlight in store
    └─ isActive: Available for sale

    CATEGORY (Product Organization)
    ├─ id: UUID
    ├─ tenantId: Foreign Key → Tenant
    │  (Each category per store)
    ├─ name: "Fresh Produce"
    ├─ slug: "fresh-produce"
    ├─ description: Category details
    └─ sortOrder: Display order

CART (User's Shopping Cart)
├─ id: UUID
├─ userId: Foreign Key → User (unique - one cart per user)
├─ tenantId: Foreign Key → Tenant
│  (Ensures user can only have cart for their store)
└─ items: [] (see CartItem below)

    CARTITEM (Individual Items in Cart)
    ├─ id: UUID
    ├─ cartId: Foreign Key → Cart
    ├─ tenantId: Foreign Key → Tenant
    │  (Double safeguard - cart + tenant isolation)
    ├─ productId: Foreign Key → Product
    ├─ quantity: 2
    ├─ unitPrice: $2.99 (saved price at time of adding)
    └─ createdAt: When added

ORDER (Placed Purchase)
├─ id: UUID
├─ tenantId: Foreign Key → Tenant
│  (Order belongs to store)
├─ userId: Foreign Key → User
├─ orderNumber: "ORD-2026-001" (Human readable)
├─ status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
├─ subtotal: $29.95
├─ tax: $2.40
├─ shippingCost: $5.00
├─ totalAmount: $37.35
├─ deliveryAddress: "123 Main St"
├─ confirmedAt, shippedAt, deliveredAt: Track timeline
└─ items: [] (see OrderItem below)

    ORDERITEM (Product in Order)
    ├─ id: UUID
    ├─ orderId: Foreign Key → Order
    ├─ tenantId: Foreign Key → Tenant
    │  (Link to store)
    ├─ productId: Foreign Key → Product
    ├─ productName: "Apple" (snapshot)
    ├─ productSku: "APPLE-001" (snapshot)
    ├─ quantity: 2
    ├─ unitPrice: $2.99
    └─ totalPrice: $5.98

PASSWORDRESETTOKEN (Security)
├─ id: UUID
├─ userId: Foreign Key → User
├─ tokenHash: Hashed token (never store plain tokens!)
├─ expiresAt: When token becomes invalid
└─ usedAt: When token was used

AUDITLOG (Compliance & Security)
├─ id: UUID
├─ tenantId: Track which store
├─ actorId: Who did the action
├─ action: "product_created" | "order_placed" | ...
├─ entityType: "Product" | "Order" | "User"
├─ entityId: What was affected
├─ oldValues: JSON (before change)
├─ newValues: JSON (after change)
└─ ipAddress, userAgent: Security tracking
```

### Data Isolation Guarantees

```
SCENARIO: Fresh Market (T1) vs Green Groceries (T2)

Fresh Market Query:
SELECT * FROM Product WHERE tenantId = 'T1'
→ Returns: Apple, Orange

Green Groceries Query:
SELECT * FROM Product WHERE tenantId = 'T2'
→ Returns: Lettuce, Carrot

🔒 ISOLATION LAYERS:

Layer 1: Row-Level (PRIMARY)
- Every table has tenantId
- WHERE tenantId = filter on every query

Layer 2: Unique Constraints
- Email unique per tenant: @@unique([tenantId, email])
- Product SKU unique per tenant: @@unique([tenantId, sku])

Layer 3: Application Logic
- Every API endpoint extracts tenantId from URL slug
- Verifies token.tenantId matches requested tenant
- Returns 403 if mismatch

Layer 4: Foreign Keys
- All relations require tenantId match
- Database enforces at storage level

🛡️ Result: COMPLETE ISOLATION
Even if hacker has database access:
- Can't see other tenants' products
- Can't modify other tenants' orders
- Can't access other tenants' users
```

---

## 6. TECH STACK BREAKDOWN

### Frontend Stack

```
┌─────────────────────────────────────────┐
│ FRONTEND: Next.js 14 + React 18         │
└─────────────────────────────────────────┘

TECHNOLOGY          PURPOSE
─────────────────────────────────────────────

Next.js 14          - Server-side rendering (SSR)
                    - Static site generation (SSG)
                    - File-based routing
                    - API routes integration
                    - Built-in optimization

React 18            - Component-based UI
                    - Hooks (useState, useEffect)
                    - Virtual DOM (efficient rendering)
                    - Reusable components

TypeScript          - Type safety
                    - Better IDE support
                    - Catch errors at compile time
                    - Self-documenting code

Tailwind CSS        - Utility-first CSS framework
                    - Responsive design (clamp())
                    - Pre-built components
                    - Mobile-first approach

CSS Grid/Flexbox    - Modern layout systems
                    - Responsive without media queries
                    - Fluid scaling with clamp()

Vercel              - Hosting (initially used)
                    - Automatic deployments
                    - Global CDN

FRONTEND FEATURES:
✅ Responsive design (320px to 4K)
✅ Hamburger menu (mobile)
✅ Product browsing
✅ Shopping cart (localStorage + backend)
✅ Order management
✅ Authentication (JWT stored in localStorage)
✅ Dark mode ready
```

### Backend Stack

```
┌─────────────────────────────────────────┐
│ BACKEND: Node.js 20 + Express           │
└─────────────────────────────────────────┘

TECHNOLOGY          PURPOSE
─────────────────────────────────────────────

Node.js 20          - JavaScript runtime
                    - Non-blocking I/O
                    - Event-driven architecture
                    - Handles thousands of connections

Express.js          - HTTP server framework
                    - Route handling
                    - Middleware support
                    - Lightweight & fast

Prisma ORM          - Type-safe database access
                    - Auto-generated queries
                    - Migration management
                    - Query builder

PostgreSQL          - Relational database
                    - ACID compliance
                    - Joins & relationships
                    - Scalable

Neon (Cloud DB)     - PostgreSQL as a Service
                    - Auto-scaling
                    - No infrastructure management
                    - Serverless

Redis               - In-memory cache
                    - Faster data retrieval
                    - Session storage
                    - Rate limiting

bcrypt              - Password hashing
                    - One-way encryption
                    - Salt-based security
                    - Brute-force resistant

JWT                 - Token-based authentication
                    - Stateless auth
                    - Self-contained claims
                    - Cross-domain compatible

Helmet              - Security headers
                    - XSS protection
                    - CSRF protection
                    - Content-Security-Policy

CORS                - Cross-Origin Resource Sharing
                    - Allow frontend requests
                    - Security checks
                    - Credential handling

Cloudinary          - Image storage & delivery
                    - Auto optimization
                    - CDN distribution
                    - Format conversion
```

### DevOps & Deployment

```
┌─────────────────────────────────────────┐
│ DEVOPS: AWS + GitHub Actions            │
└─────────────────────────────────────────┘

AWS EC2             - Compute instances
                    - Ubuntu 24.04
                    - t3.micro (free tier eligible)
                    - Public IP for access

Nginx               - Reverse proxy
                    - Load balancing
                    - Static file serving
                    - SSL/TLS termination
                    - Compression (gzip)

PM2                 - Process manager
                    - Auto-restart on crash
                    - Clustering
                    - Monitoring
                    - Logging

GitHub Actions      - CI/CD pipeline
                    - Auto-build on push
                    - Auto-test
                    - Auto-deploy
                    - Zero configuration needed

Git                 - Version control
                    - Collaboration
                    - History tracking
                    - Branching

Docker              - Containerization (future)
                    - Consistent environments
                    - Easy deployment
                    - Scaling

SSL/TLS             - Encryption
                    - HTTPS support
                    - Certificate management
                    - Security

DEPLOYMENT FLOW:
Developer → git push → GitHub Actions → Build → Test → Deploy to EC2
            (automatic)                 (npm install, build)

CURRENT DEPLOYMENT:
✅ Backend: EC2 + PM2 + Nginx
✅ Frontend: EC2 + Nginx (serves built Next.js)
✅ Database: Neon (Cloud PostgreSQL)
✅ Images: Cloudinary
✅ CI/CD: GitHub Actions
```

---

## 7. AUTHENTICATION & AUTHORIZATION

### Authentication (Who are you?)

```
┌────────────────────────────────────────┐
│ AUTHENTICATION FLOW                    │
└────────────────────────────────────────┘

Step 1: User provides credentials
Email: user@example.com
Password: MySecurePass123

Step 2: Backend verifies
├─ Find user by email
├─ Use bcrypt to compare:
│  bcrypt.compare(
│    inputPassword,
│    storedPasswordHash
│  )
└─ If match → generate JWT

JWT Token = Proof of Identity
Contains:
{
  userId: "abc123",
  email: "user@example.com",
  tenantId: "tenant-xyz",
  role: "customer",
  iat: 1713600000,
  exp: 1713686400
}

Signature proves token wasn't tampered with

Step 3: Frontend stores token
localStorage.setItem('authToken', token)

Step 4: Include in future requests
Header: Authorization: Bearer <token>

Step 5: Backend verifies token
├─ Check signature (not modified?)
├─ Check expiration (not expired?)
├─ Extract userId, tenantId, role
└─ Grant access if all valid

❌ If token invalid/missing/expired → 401 Unauthorized
```

### Authorization (What can you do?)

```
┌────────────────────────────────────────┐
│ AUTHORIZATION & ROLES                  │
└────────────────────────────────────────┘

ROLE HIERARCHY:

super_admin
├─ System administrator
├─ Can see all tenants
├─ Can manage all users
├─ Can view analytics
└─ Permissions: ALL

store_owner
├─ Owns a specific tenant
├─ Can manage products
├─ Can manage staff
├─ Can view their orders
├─ Cannot see other stores
└─ Permissions: Tenant-specific

staff
├─ Works for a specific store
├─ Can manage products
├─ Can process orders
├─ Can't manage users
└─ Permissions: Limited tenant access

customer
├─ Shops at stores
├─ Can browse products
├─ Can place orders
├─ Can see own orders only
└─ Permissions: Browse & purchase only

AUTHORIZATION CHECK EXAMPLE:

User tries: GET /api/v1/tenants/fresh-market/products
Backend:
├─ 1. Is token valid?
├─ 2. Extract: role = "staff", tenantId = "T1"
├─ 3. Does URL tenant match token tenant?
│    URL tenant: "fresh-market" (lookup → T1) ✓
│    Token tenant: T1 ✓
├─ 4. Does role have permission?
│    "staff" can browse products? ✓ YES
└─ 5. Grant access to fresh-market products

User tries: GET /api/v1/tenants/green-groceries/products
Backend:
├─ 1. Is token valid? ✓
├─ 2. Extract: tenantId = "T1"
├─ 3. Does URL tenant match token tenant?
│    URL tenant: "green-groceries" (lookup → T2)
│    Token tenant: T1
│    T2 ≠ T1 ✗ MISMATCH
└─ 4. Return 403 Forbidden
     (Even though staff role could browse, tenant doesn't match)

ISOLATION ENFORCED AT 2 LEVELS:
1. Token claims (what tenant does user belong to?)
2. URL/request (what tenant is being accessed?)
Both must match!
```

---

## 8. API ENDPOINTS & FLOWS

### RESTful API Design

```
┌──────────────────────────────────────────┐
│ API ENDPOINT PATTERNS                    │
└──────────────────────────────────────────┘

AUTHENTICATION ENDPOINTS:
POST   /api/v1/auth/signup          - Create account
POST   /api/v1/auth/login           - Get JWT token
POST   /api/v1/auth/logout          - Invalidate token

TENANT ENDPOINTS:
GET    /api/v1/tenants              - List all stores
GET    /api/v1/tenants/{slug}       - Get store details
GET    /api/v1/tenants/{slug}/products       - List products
GET    /api/v1/tenants/{slug}/categories    - List categories
POST   /api/v1/tenants/{slug}/products      - Add product

PRODUCT ENDPOINTS:
GET    /api/v1/tenants/{slug}/products/{id}     - Get product
PUT    /api/v1/tenants/{slug}/products/{id}     - Update product
DELETE /api/v1/tenants/{slug}/products/{id}     - Delete product

CART ENDPOINTS:
GET    /api/v1/tenants/{slug}/cart            - Get cart
POST   /api/v1/tenants/{slug}/cart/items      - Add to cart
DELETE /api/v1/tenants/{slug}/cart/items/{id} - Remove from cart
PUT    /api/v1/tenants/{slug}/cart/items/{id} - Update quantity

ORDER ENDPOINTS:
GET    /api/v1/tenants/{slug}/orders         - List orders
POST   /api/v1/tenants/{slug}/orders         - Place order
GET    /api/v1/tenants/{slug}/orders/{id}    - Get order details
PUT    /api/v1/tenants/{slug}/orders/{id}    - Update order status

USER ENDPOINTS:
GET    /api/v1/users                         - List users (admin)
GET    /api/v1/users/{id}                    - Get user
PUT    /api/v1/users/{id}                    - Update user
DELETE /api/v1/users/{id}                    - Delete user

DASHBOARD ENDPOINTS:
GET    /api/v1/dashboard/analytics           - System stats
GET    /api/v1/dashboard/{tenantId}/stats    - Store stats
```

### Example API Flow: Place Order

```
┌────────────────────────────────────────┐
│ PLACE ORDER COMPLETE FLOW               │
└────────────────────────────────────────┘

STEP 1: Frontend prepares order
User clicks "Place Order" on cart page
{
  items: [
    { productId: "prod-1", quantity: 2 },
    { productId: "prod-2", quantity: 1 }
  ],
  deliveryAddress: "123 Main St",
  notes: "Ring bell loudly"
}

STEP 2: Frontend sends request
POST /api/v1/tenants/fresh-market/orders

Headers:
Authorization: Bearer <jwt_token>
Content-Type: application/json

Body:
{
  items: [...],
  deliveryAddress: "...",
  notes: "..."
}

STEP 3: Backend receives & validates
├─ 3a. Extract tenant: "fresh-market" → T1
├─ 3b. Verify JWT token valid
├─ 3c. Verify token.tenantId == T1
├─ 3d. Extract userId from token
├─ 3e. Get user details from database
├─ 3f. Verify user role (customer/staff allowed)
└─ 3g. Continue to order creation

STEP 4: Validate items
For each item:
├─ Check product exists: Product.findUnique({id, tenantId: T1})
├─ Check product belongs to tenant
├─ Check stock available
├─ Get current price
└─ Add to itemsToCreate array

If any validation fails:
Return 400 Bad Request with error details

STEP 5: Create order transaction
Start database transaction (all-or-nothing):
├─ 5a. Create Order record:
│  {
│    id: uuid(),
│    tenantId: T1,
│    userId: user.id,
│    orderNumber: "ORD-2026-001234",
│    status: "pending",
│    subtotal: 29.95,
│    tax: 2.40,
│    shippingCost: 5.00,
│    totalAmount: 37.35,
│    deliveryAddress: "123 Main St"
│  }
│
├─ 5b. Create OrderItems (for each product):
│  {
│    orderId: order.id,
│    tenantId: T1,
│    productId: "prod-1",
│    productName: "Apple",
│    productSku: "APPLE-001",
│    quantity: 2,
│    unitPrice: 2.99,
│    totalPrice: 5.98
│  }
│
├─ 5c. Clear cart:
│  CartItem.deleteMany({
│    where: { cartId: userCart.id }
│  })
│
└─ 5d. Update product stock (if needed):
   Product.update({
     where: {id: "prod-1", tenantId: T1},
     data: {
       stockQuantity: oldStock - 2
     }
   })

If any step fails:
Transaction rolled back (no partial order created)

STEP 6: Return success response
HTTP 201 Created

{
  "success": true,
  "data": {
    "order": {
      "id": "order-789",
      "orderNumber": "ORD-2026-001234",
      "status": "pending",
      "totalAmount": 37.35,
      "items": [
        {
          "productName": "Apple",
          "quantity": 2,
          "totalPrice": 5.98
        },
        {
          "productName": "Orange",
          "quantity": 1,
          "totalPrice": 2.99
        }
      ],
      "createdAt": "2026-04-20T15:30:00Z"
    }
  },
  "message": "Order placed successfully"
}

STEP 7: Frontend handles response
├─ Show "Order placed!" success message
├─ Redirect to order details page
├─ Clear cart state (setCart([]))
├─ Update user's order list
└─ Save order ID for future reference

STEP 8: Store owner sees order
Store owner logs in:
├─ Goes to dashboard
├─ Sees new order in "Pending Orders"
├─ Can change status: pending → confirmed → shipped → delivered
└─ Can print packing slip

🔒 SECURITY CHECKS THROUGHOUT:
- Only owner of order can view it (userId match)
- Only store owner can manage orders from their store (tenantId match)
- Products can only be from same store (tenantId match)
- No SQL injection (Prisma parameterized queries)
- No XSS (React escaping)
- CORS validates origin
```

---

## 9. FRONTEND ARCHITECTURE

### Page Structure

```
┌─────────────────────────────────────────┐
│ NEXT.JS APP STRUCTURE                   │
└─────────────────────────────────────────┘

app/
├── layout.tsx
│   └─ Root layout (wraps all pages)
│      - Metadata
│      - CSS imports
│      - Global providers
│
├── page.tsx
│   └─ HOME PAGE (/)
│      - Store listings
│      - Featured products
│      - Hero section
│
├── auth/
│   ├── login/page.tsx
│   │   └─ USER LOGIN
│   │      - Email input
│   │      - Password input
│   │      - JWT token handling
│   │
│   └── signup/page.tsx
│       └─ USER REGISTRATION
│          - Name, email, password
│          - Role selection
│          - Tenant association
│
├── store/[slug]/
│   └─ STORE PAGE (dynamic)
│      - URL: /store/fresh-market
│      - List all products for store
│      - Categories sidebar
│      - Hamburger menu (mobile)
│      - Add to cart functionality
│      - Product filtering & sorting
│
├── store/[slug]/product/[productId]/
│   └─ PRODUCT DETAIL PAGE
│      - Full product info
│      - Large image
│      - Reviews (if implemented)
│      - Related products
│      - Add to cart/quantity selector
│
├── cart/
│   └─ SHOPPING CART PAGE
│      - List cart items
│      - Quantity controls
│      - Remove items
│      - Subtotal/tax/shipping
│      - "Place Order" button
│      - Delivery address form
│
├── dashboard/
│   └─ USER DASHBOARD
│      - Profile info
│      - Order history
│      - Saved addresses
│      - Logout button
│
├── admin/
│   └─ ADMIN PANEL (if admin)
│      - User management
│      - Analytics
│      - System settings
│
└── debug/
    └─ DEBUG PAGE
       - API URL status
       - Health check
       - Environment variables

RESPONSIVE MOBILE FEATURES:
✅ Hamburger menu (☰)
✅ Mobile-optimized layout
✅ Touch-friendly buttons
✅ Responsive images
✅ Fluid typography (clamp())
```

### Component Architecture

```
┌──────────────────────────────────────────┐
│ COMPONENT HIERARCHY                      │
└──────────────────────────────────────────┘

<Layout>
└── Global wrappers & CSS
    │
    ├── <Header>
    │   ├── Logo
    │   ├── Search bar
    │   ├── Hamburger menu (mobile)
    │   └── Cart badge
    │
    ├── <Main Content>
    │   ├── <HeroSection>
    │   ├── <ProductGrid>
    │   │   └── <ProductCard> (repeated)
    │   │       ├── Product image
    │   │       ├── Product name
    │   │       ├── Price
    │   │       └── Add to cart button
    │   │
    │   ├── <Sidebar> (tablet+)
    │   │   └── <CategoryList>
    │   │       └── <CategoryButton> (repeated)
    │   │
    │   └── <CartSummary>
    │       ├── Item count
    │       ├── Total amount
    │       └── Checkout button
    │
    └── <Footer>
        ├── Links
        ├── Contact info
        └── Copyright

STATE MANAGEMENT:
- useState: Local component state
  Example: productFilter, cartItems, loading
- useEffect: Side effects & data fetching
  Example: Fetch products when component mounts
- Context API: Shared state (optional)
  Example: User info, authentication state
- localStorage: Persistent state
  Example: Cart data, auth token, user preferences
```

### Data Flow Frontend

```
┌──────────────────────────────────────────┐
│ FRONTEND DATA FLOW                       │
└──────────────────────────────────────────┘

1. PAGE LOAD
   ├─ layout.tsx renders
   ├─ Global CSS loads
   ├─ Check localStorage for authToken
   ├─ If token exists → auto-login
   └─ Render page content

2. PRODUCT LISTING (/store/fresh-market)
   ├─ Extract slug: "fresh-market"
   ├─ useEffect hook → fetch products
   ├─ API call: /api/v1/tenants/fresh-market/products
   ├─ Backend returns: [...products]
   ├─ setState(products)
   ├─ React re-renders with data
   └─ User sees products on screen

3. USER INTERACTION
   ├─ User clicks "Add to cart"
   ├─ onClick handler fires
   ├─ Prepares cartItem data
   ├─ POST /api/v1/tenants/fresh-market/cart/items
   ├─ Backend updates database
   ├─ Frontend receives confirmation
   ├─ Update state: setCart([...oldCart, newItem])
   ├─ React re-renders (updates UI)
   ├─ Save to localStorage backup
   └─ Show "Item added!" toast

4. ROUTING
   ├─ User clicks link
   ├─ Next.js intercepts click (no full page reload)
   ├─ Route to new page (client-side navigation)
   ├─ Fetch data for new page
   ├─ Render new content
   └─ Update URL in address bar

5. ERROR HANDLING
   ├─ API call fails
   ├─ catch() block executes
   ├─ setError("Failed to load...")
   ├─ Show error message on screen
   ├─ User can retry
   └─ Log error for debugging

LOCALSTORAGE USAGE:
- authToken: JWT for authentication
- cart_[slug]: User's cart (backup)
- user_preferences: Theme, language, etc.
- last_visited: Track user journey
```

---

## 10. DEPLOYMENT & DEVOPS

### Deployment Architecture

```
┌────────────────────────────────────────────────┐
│ DEPLOYMENT INFRASTRUCTURE                      │
└────────────────────────────────────────────────┘

DEVELOPER (Local)
    │
    └─ git push origin main
         │
         ▼
    GITHUB (Repository)
         │
         └─ Webhook trigger
              │
              ▼
    GITHUB ACTIONS (CI/CD)
         │
         ├─ Checkout code
         ├─ Install dependencies (pnpm install)
         ├─ Run tests
         ├─ Build projects (pnpm build)
         ├─ If all pass: deploy
         └─ If fails: notify developer
              │
              ▼
    AWS EC2 INSTANCES
         │
         ├─ Backend Server
         │   ├─ Pull updated code
         │   ├─ Install dependencies
         │   ├─ Build backend
         │   ├─ PM2 restart service
         │   └─ Running on port 3001
         │
         └─ Frontend Server
             ├─ Pull updated code
             ├─ Install dependencies
             ├─ Build Next.js app
             ├─ Restart Nginx
             └─ Serving on port 80/443
              │
              ▼
    DATABASES & SERVICES
         │
         ├─ PostgreSQL (Neon Cloud)
         ├─ Redis (Cache)
         └─ Cloudinary (Images)
              │
              ▼
    USER BROWSER
         │
         └─ Visits https://ip-address
             ├─ Gets HTML/CSS/JS from Nginx
             ├─ Makes API calls to backend
             ├─ Stores JWT in localStorage
             └─ User sees app
```

### CI/CD Pipeline

```
┌────────────────────────────────────────┐
│ GITHUB ACTIONS WORKFLOW                │
└────────────────────────────────────────┘

Trigger: git push to main

Step 1: Setup
- Checkout repository code
- Install Node.js 20
- Install pnpm package manager

Step 2: Dependencies
- Run: pnpm install --frozen-lockfile
- Install all project dependencies

Step 3: Build
- Backend: Build Express server
  pnpm build --filter=@grocio/api
- Frontend: Build Next.js app
  pnpm build --filter=@grocio/web
- If build fails → STOP, notify developer

Step 4: Test (Optional)
- Run unit tests
- Run integration tests
- Run security tests
- If tests fail → STOP

Step 5: Deploy (If all pass)
- SSH into EC2 instance
- Pull latest code
- Restart services
- Verify health check

Result:
✅ All tests passed
✅ Build successful
✅ Deployed to EC2
✅ Users see new version
```

### Monitoring & Health

```
┌────────────────────────────────────────┐
│ HEALTH MONITORING                      │
└────────────────────────────────────────┘

HEALTH CHECK ENDPOINTS:
GET /api/v1/health
→ Returns: { status: "ok", timestamp: "..." }

FRONTEND MONITORING:
- Page load time
- Component render time
- API response time
- Error tracking
- User interaction tracking

BACKEND MONITORING:
- CPU usage
- Memory usage
- Database connection pool
- API response times
- Error rate
- Request rate

PM2 DASHBOARD (Process Manager):
pm2 monit
├─ CPU: Process CPU usage
├─ Memory: RAM usage
├─ Status: Running/Stopped
└─ Uptime: How long running

NGINX LOGS:
tail -f /var/log/nginx/access.log
├─ All requests logged
├─ Response codes
├─ Response times
└─ Error tracking
```

---

## SUMMARY: How Everything Connects

```
┌──────────────────────────────────────────────────────┐
│ COMPLETE GROCIO SYSTEM OVERVIEW                      │
└──────────────────────────────────────────────────────┘

1. PROJECT TYPE
   ✅ SaaS Multi-Tenant E-Commerce Platform
   ✅ One codebase serves multiple stores
   ✅ Complete data isolation per tenant

2. MULTI-TENANCY
   ✅ Row-Level Tenancy (most cost-effective)
   ✅ Every table has tenantId
   ✅ Queries filtered by tenantId
   ✅ URL slug identifies tenant
   ✅ JWT token validates tenant access

3. DATA FLOW
   User → Frontend → API → Database → Response → UI Update
   ✅ All requests include tenant identification
   ✅ All database queries filtered by tenantId
   ✅ JWT token ensures authentication
   ✅ Authorization checks ensure permission

4. AUTHENTICATION
   ✅ JWT tokens (stateless)
   ✅ Password hashed with bcrypt
   ✅ Token stored in localStorage
   ✅ Included in Authorization header
   ✅ Verified on every request

5. AUTHORIZATION
   ✅ Role-based (super_admin, store_owner, staff, customer)
   ✅ Tenant isolation (can only access own tenant)
   ✅ Permission checks at API level
   ✅ Enforced in database queries

6. DATABASE
   ✅ PostgreSQL (Neon Cloud)
   ✅ Prisma ORM (type-safe queries)
   ✅ Row-level security (tenantId in every table)
   ✅ Relationships maintained via foreign keys
   ✅ Audit logs for compliance

7. CACHING
   ✅ Redis for performance
   ✅ Reduce database queries
   ✅ Faster response times
   ✅ Session storage

8. DEPLOYMENT
   ✅ AWS EC2 (two instances)
   ✅ Nginx (reverse proxy, SSL, compression)
   ✅ PM2 (process management)
   ✅ GitHub Actions (automated CI/CD)
   ✅ PostgreSQL & Redis (managed services)

9. SECURITY
   ✅ HTTPS/TLS encryption
   ✅ Password hashing (bcrypt)
   ✅ JWT validation
   ✅ CORS restrictions
   ✅ Helmet security headers
   ✅ SQL injection prevention (Prisma)
   ✅ XSS prevention (React)
   ✅ Audit logging

10. SCALABILITY
    ✅ Horizontal: Add more EC2 instances + load balancer
    ✅ Vertical: Upgrade instance size
    ✅ Database: Neon auto-scales
    ✅ Caching: Redis performance
    ✅ CDN: Cloudinary for images
```

---

## KEY CONCEPTS CHECKLIST

- ✅ **Multi-Tenant**: One app, multiple isolated stores
- ✅ **Tenancy Type**: Row-Level (tenantId column)
- ✅ **Data Isolation**: WHERE tenantId = filter
- ✅ **Authentication**: JWT tokens
- ✅ **Authorization**: Role-based + tenant isolation
- ✅ **Token Flow**: Issue → Store → Include in requests → Verify
- ✅ **API Design**: RESTful with tenant slug in URL
- ✅ **Database**: PostgreSQL with Prisma
- ✅ **Frontend**: Next.js 14 with React
- ✅ **Backend**: Node.js + Express
- ✅ **Deployment**: AWS EC2 + GitHub Actions
- ✅ **Security**: Multiple layers (JWT, role, tenant, encryption)

---

**This is the complete Grocio system explained from top to bottom! Every concept, every data flow, every token journey. You now have a 100% clear understanding of how this multi-tenant e-commerce platform works! 🚀**
