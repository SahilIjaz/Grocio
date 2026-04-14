# Grocio - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  (Next.js Frontend - React Components & Pages)              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Home Page   │  │ Auth Pages   │  │ Store Pages  │      │
│  │  & Stores    │  │ (Login/Signup│  │ (Products &  │      │
│  │              │  │   Flows)     │  │  Cart)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ Admin Panel  │  │  Checkout    │      │
│  │  (Store      │  │  (System     │  │  (Order      │      │
│  │   Owner)     │  │   Mgmt)      │  │   Flow)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Design System: CSS with Variables, Animations, Gradients  │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                               │
│          (Express.js REST API - Port 3001)                  │
│                                                              │
│  Authentication Endpoints:                                  │
│  - POST /api/v1/auth/login                                  │
│  - POST /api/v1/auth/register                               │
│                                                              │
│  Store Endpoints:                                           │
│  - GET /api/v1/tenants                                      │
│  - GET /api/v1/tenants/:slug                                │
│  - GET /api/v1/tenants/:slug/products                       │
│  - GET /api/v1/tenants/:slug/categories                     │
│                                                              │
│  Cart & Order Endpoints:                                    │
│  - POST /api/v1/cart/add                                    │
│  - GET /api/v1/cart/:cartId                                 │
│  - POST /api/v1/orders                                      │
│                                                              │
│  Middleware:                                                │
│  - CORS (Allow frontend requests)                           │
│  - Helmet (Security headers)                                │
│  - Express JSON parser                                      │
│  - Error handling                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓ SQL/Queries
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER                             │
│         (Neon PostgreSQL + Prisma ORM)                      │
│                                                              │
│  Tables:                                                    │
│  ├── Tenant (Stores)                                        │
│  ├── User (Customers, Store Owners, Admins)                │
│  ├── Product (Store Products)                               │
│  ├── Category (Product Categories)                          │
│  ├── Cart (User Shopping Carts)                             │
│  ├── CartItem (Cart Line Items)                             │
│  ├── Order (Customer Orders)                                │
│  ├── OrderItem (Order Line Items)                           │
│  └── AuditLog (System Activity)                             │
│                                                              │
│  Relationships:                                             │
│  - One Tenant has many Users, Products, Categories, Orders │
│  - One User has many Carts, Orders                          │
│  - One Product has many CartItems, OrderItems              │
│  - One Cart has many CartItems                             │
│  - One Order has many OrderItems                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### **Customer Shopping Flow**
```
Customer                Frontend              API              Database
   |                      |                   |                   |
   |--Browse Stores------>|                   |                   |
   |                      |---GET /tenants--->|---SELECT tenants--→
   |                      |<--[tenants]-------|<--[tenants]-------│
   |<--Display Stores-----|                   |                   |
   |                      |                   |                   |
   |--Select Store------->|                   |                   |
   |                      |--GET /products--->|---SELECT products→
   |                      |<--[products]------|<--[products]------│
   |<--Display Products---|                   |                   |
   |                      |                   |                   |
   |--Add to Cart-------->|                   |                   |
   |  (localStorage)      |                   |                   |
   |                      |                   |                   |
   |--Checkout---------->|---POST /orders--->|---INSERT order--->
   |                      |                   |---INSERT items--->
   |                      |<--[order]---------|<--[order]--------│
   |<--Order Complete-----|                   |                   |
```

### **Store Owner Management Flow**
```
Store Owner            Frontend              API              Database
   |                      |                   |                   |
   |--Login------------->|                   |                   |
   |                      |---POST /login---->|---SELECT user---->
   |                      |<--[user token]---|<--[user]----------│
   |<--Redirect Dashboard-│                   |                   |
   |                      |                   |                   |
   |--Add Product-------->|                   |                   |
   |                      |---POST /products--→|---INSERT product→
   |                      |<--[product]-------|<--[id]----------│
   |<--Product Added------|                   |                   |
   |                      |                   |                   |
   |--View Orders-------->|                   |                   |
   |                      |---GET /orders---->|---SELECT orders-→
   |                      |<--[orders]--------|<--[orders]-------│
   |<--Display Orders-----|                   |                   |
```

---

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────┐
│                  LOGIN PROCESS                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User visits /auth/login                             │
│                                                          │
│  2. Enters email & password                             │
│                                                          │
│  3. Frontend sends POST /api/v1/auth/login              │
│     with { email, password }                            │
│                                                          │
│  4. API validates credentials                           │
│     - Find user by email                                │
│     - Compare password with hash                        │
│                                                          │
│  5. If valid:                                           │
│     - Return { id, email, role, firstName, lastName }   │
│                                                          │
│  6. Frontend stores in localStorage as "user"           │
│                                                          │
│  7. Redirect based on role:                             │
│     - super_admin → /admin                              │
│     - store_admin → /dashboard                          │
│     - customer → /                                      │
│                                                          │
│  8. Each protected page checks localStorage.user:       │
│     - No user → Redirect to /auth/login                 │
│     - Wrong role → Redirect to appropriate page         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Component Structure

### **Frontend Components**

#### **Public Pages**
```
/app
├── page.tsx                 # Home page with store listings
├── /auth
│   ├── login/page.tsx      # Login page
│   └── signup/page.tsx     # Registration page
├── /store/[slug]
│   └── page.tsx            # Store product listing
└── /cart
    └── page.tsx            # Cart & checkout
```

#### **Protected Pages (Require Authentication)**
```
├── /dashboard              # Store owner dashboard
│   ├── Overview stats
│   ├── Product management
│   ├── Category management
│   ├── Orders viewing
│   ├── Inventory tracking
│   └── Store settings
│
└── /admin                  # Super admin panel
    ├── System dashboard
    ├── Tenant management
    ├── User management
    ├── Analytics
    └── System settings
```

#### **Styling**
```
└── app/
    ├── styles.css          # Design system with:
    │   ├── CSS Variables (colors, spacing, shadows)
    │   ├── Typography system
    │   ├── Button styles
    │   ├── Form styles
    │   ├── Card components
    │   └── Animations
    │
    └── layout.tsx          # Root layout importing styles
```

### **Backend Structure**

```
/apps/api/src
├── server.ts               # Express app with all routes
│   ├── Health check
│   ├── Auth endpoints (login, register)
│   ├── Store endpoints (tenants, products, categories)
│   ├── Cart endpoints
│   └── Order endpoints
│
└── /prisma
    ├── schema.prisma       # Database schema & models
    ├── migrations/         # Database migration files
    ├── seed.ts             # Demo data seed script
    └── client.ts           # Prisma client instance
```

---

## 🗄️ Database Schema

### **Tenant (Multi-Tenant Store)**
```typescript
model Tenant {
  id: String @id @default(cuid()) @db.Uuid
  name: String
  slug: String @unique
  status: String @default("active")
  logoUrl: String?
  contactEmail: String
  contactPhone: String?
  address: String?
  settings: Json? // { taxRate, currency, timezone, deliveryFee, orderPrefix }
  
  // Relations
  users: User[]
  products: Product[]
  categories: Category[]
  carts: Cart[]
  orders: Order[]
}
```

### **User (Multi-Role)**
```typescript
model User {
  id: String @id @default(cuid()) @db.Uuid
  email: String
  passwordHash: String
  firstName: String
  lastName: String
  role: String // "super_admin", "store_admin", "customer"
  tenantId: String? @db.Uuid // For store admins
  
  // Relations
  carts: Cart[]
  orders: Order[]
  tenant: Tenant?
}
```

### **Product & Category**
```typescript
model Product {
  id: String @id @default(cuid()) @db.Uuid
  tenantId: String @db.Uuid
  categoryId: String @db.Uuid
  name: String
  description: String?
  price: Decimal
  sku: String
  stockQuantity: Int
  isActive: Boolean
  
  // Relations
  tenant: Tenant
  category: Category
  cartItems: CartItem[]
  orderItems: OrderItem[]
}

model Category {
  id: String @id @default(cuid()) @db.Uuid
  tenantId: String @db.Uuid
  name: String
  slug: String
  description: String?
  isActive: Boolean
  
  // Relations
  tenant: Tenant
  products: Product[]
}
```

### **Cart & Orders**
```typescript
model Cart {
  id: String @id @default(cuid()) @db.Uuid
  userId: String @db.Uuid
  tenantId: String @db.Uuid
  
  // Relations
  user: User
  tenant: Tenant
  items: CartItem[]
}

model Order {
  id: String @id @default(cuid()) @db.Uuid
  userId: String @db.Uuid
  tenantId: String @db.Uuid
  orderNumber: String @unique
  subtotal: Decimal
  totalAmount: Decimal
  deliveryAddress: String
  status: String @default("pending")
  
  // Relations
  user: User
  tenant: Tenant
  items: OrderItem[]
}
```

---

## 🔄 Request/Response Flow

### **Example: Get Products for Store**

```
1. FRONTEND REQUEST
   GET http://localhost:3000/store/demo-grocery

2. BROWSER ROUTING
   - Route matches /store/[slug]/page.tsx
   - Component mounts, runs useEffect

3. API CALL
   fetch("http://localhost:3001/api/v1/tenants/demo-grocery/products")

4. API SERVER
   - app.get("/api/v1/tenants/:tenantSlug/products")
   - Find tenant by slug
   - SELECT * FROM products WHERE tenantId = :id AND isActive = true

5. DATABASE QUERY
   - Query products for this tenant
   - Include category relation
   - Return array of products

6. API RESPONSE
   [
     {
       id: "...",
       name: "Red Apples",
       price: "3.99",
       category: { name: "Produce" },
       ...
     },
     ...
   ]

7. FRONTEND PROCESSING
   - setProducts(data)
   - Re-render product grid
   - Display with styling

8. USER VIEW
   - Products displayed with images, prices, add to cart buttons
   - Category filters in sidebar
   - Search functionality
   - Cart summary at bottom
```

---

## 🔐 Security Layers

### **Frontend Security**
- ✅ Role-based route protection
- ✅ LocalStorage authentication
- ✅ Input validation on forms
- ✅ Error boundary handling

### **API Security**
- ✅ CORS enabled for frontend only
- ✅ Helmet security headers
- ✅ Input validation & sanitization
- ✅ Error handling with safe messages

### **Database Security**
- ✅ UUID primary keys (not sequential)
- ✅ Foreign key constraints
- ✅ Data isolation by tenant
- ✅ Password hashing (API side)

---

## 📈 Scalability Considerations

### **Multi-Tenancy**
- Logical data isolation via `tenantId`
- Each tenant has own products, users, orders
- Store-specific settings & configuration

### **Performance**
- Database indexing on frequently queried fields
- Efficient queries with Prisma
- Frontend caching with React state
- CSS-in-JS for optimal styling

### **Future Enhancements**
- Physical database separation for large tenants
- Redis caching layer
- CDN for static assets
- Horizontal API scaling
- Advanced analytics & reporting

---

## 🚀 Deployment Architecture

```
┌──────────────────┐
│  Browser/Client  │
└────────┬─────────┘
         │ HTTPS
         ↓
┌──────────────────────────────────────┐
│  CDN / Static Asset Hosting          │
│  (Next.js build output)              │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Node.js Express API Server(s)       │
│  (Load balanced)                      │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Database Server                     │
│  (Neon PostgreSQL)                   │
└──────────────────────────────────────┘
```

---

## 📝 Summary

- **Multi-tenant architecture** with role-based access
- **Modern frontend** with responsive design
- **RESTful API** with clear endpoint structure
- **PostgreSQL database** with relational schema
- **Professional UI** with design system
- **Security-first** approach to data & access
- **Scalable** architecture for future growth
