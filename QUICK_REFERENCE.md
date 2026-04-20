# Grocio - Quick Reference Guide

## What is Grocio?

**SaaS Multi-Tenant E-Commerce Platform**
- One app serves MULTIPLE grocery stores
- Each store completely isolated
- Shared infrastructure (cost-efficient)
- Production-grade, deployment-ready

---

## The 30-Second Explanation

```
Think of Grocio like Shopify but for grocery stores:

Grocio = Platform
Fresh Market = Store Owner 1
Green Groceries = Store Owner 2
Organic Farm = Store Owner 3

Each store:
✓ Has own products
✓ Has own customers
✓ Has own orders
✓ Can't see other stores' data

All stores:
✓ Use same technology
✓ Share infrastructure
✓ Get automatic updates
```

---

## Multi-Tenancy Explained in 10 Seconds

**Multiple stores, ONE database, complete isolation**

```
Database has tenantId column on EVERY table

Fresh Market query:   SELECT * WHERE tenantId='T1' → Only T1 data
Green Groceries query: SELECT * WHERE tenantId='T2' → Only T2 data

= ISOLATION GUARANTEED!
```

---

## Complete Data Flow (Request Path)

```
1. User clicks "Add to Cart"
   ↓
2. Frontend makes request with JWT token
   POST /api/v1/tenants/fresh-market/cart/items
   Header: Authorization: Bearer <token>
   ↓
3. Backend validates token
   ✓ Token signature valid?
   ✓ Token not expired?
   ✓ Token.tenantId matches URL tenant?
   ↓
4. Backend verifies product
   ✓ Product exists?
   ✓ Product belongs to same tenant?
   ✓ Stock available?
   ↓
5. Backend adds to database
   CartItem.create({
     tenantId: T1,  ← ISOLATION
     productId: ...,
     quantity: 2
   })
   ↓
6. Frontend receives response
   ✓ Updates UI
   ✓ Shows success toast
   ✓ Saves to localStorage
   ↓
7. Cart updated for user
```

---

## Tech Stack at a Glance

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + React | Web interface, SSR |
| **Backend** | Node.js + Express | API server |
| **Database** | PostgreSQL (Neon) | Data storage, isolation |
| **ORM** | Prisma | Type-safe queries |
| **Cache** | Redis | Performance |
| **Auth** | JWT + bcrypt | Secure login |
| **Images** | Cloudinary | Image storage |
| **Deployment** | AWS EC2 + Nginx | Infrastructure |
| **CI/CD** | GitHub Actions | Auto-deploy |

---

## Authentication Flow

```
1. Login
   User → Email + Password → Backend
   Backend hashes password, matches with stored hash
   ✓ Match → Generate JWT token
   JWT contains: userId, tenantId, role, expiry
   
2. Storage
   Frontend → localStorage['authToken'] = token
   
3. Usage
   Every request → Header: Authorization: Bearer <token>
   
4. Verification
   Backend → jwt.verify(token, SECRET)
   ✓ Valid & not expired → Continue
   ✗ Invalid or expired → 401 Unauthorized
   
5. Isolation
   Token has tenantId
   User can only access their own store
```

---

## Authorization: Who Can Do What?

```
super_admin
  └─ System admin, all permissions

store_owner
  └─ Owns specific store
     ├─ Manage products
     ├─ View orders
     └─ Cannot see other stores

staff
  └─ Works in a store
     ├─ Manage products (limited)
     └─ Cannot manage users

customer
  └─ Shops at stores
     ├─ Browse products
     └─ Place orders
```

---

## Database Schema: Key Tables

```
Tenant (Store)
  ├─ id, name, slug, logo, contact info
  │
  ├─ User (Employees & Customers)
  │  └─ id, email, passwordHash, role, tenantId
  │
  ├─ Product (Store's Inventory)
  │  └─ id, name, price, stock, tenantId
  │
  ├─ Category
  │  └─ id, name, tenantId
  │
  ├─ Cart
  │  └─ id, userId, tenantId
  │     └─ CartItem (Products in cart)
  │        └─ id, cartId, productId, quantity, tenantId
  │
  └─ Order
     └─ id, userId, status, totalAmount, tenantId
        └─ OrderItem (Products ordered)
           └─ id, orderId, productId, quantity, tenantId

🔒 EVERY table has tenantId!
```

---

## API Endpoint Patterns

```
Authentication
POST   /api/v1/auth/signup
POST   /api/v1/auth/login

Stores
GET    /api/v1/tenants              (list all)
GET    /api/v1/tenants/{slug}       (get one)

Products
GET    /api/v1/tenants/{slug}/products
POST   /api/v1/tenants/{slug}/products
GET    /api/v1/tenants/{slug}/products/{id}

Cart
GET    /api/v1/tenants/{slug}/cart
POST   /api/v1/tenants/{slug}/cart/items
DELETE /api/v1/tenants/{slug}/cart/items/{id}

Orders
GET    /api/v1/tenants/{slug}/orders
POST   /api/v1/tenants/{slug}/orders
```

---

## Frontend Pages

```
/ (Home)
  └─ List all stores, featured products

/store/{slug}
  └─ Store view: products, categories, add to cart

/store/{slug}/product/{id}
  └─ Product detail, reviews, related products

/cart
  └─ Shopping cart, checkout

/auth/login
  └─ Login form, JWT token storage

/auth/signup
  └─ Registration, role selection

/dashboard
  └─ User profile, order history

/admin
  └─ Admin panel (if admin)
```

---

## Deployment Architecture

```
Developer
  └─ git push to GitHub
     └─ GitHub Actions triggered
        ├─ Install dependencies
        ├─ Run tests
        ├─ Build projects
        └─ Deploy to EC2
           │
           ├─ Backend (Node.js + PM2)
           │  └─ Running on port 3001
           │
           └─ Frontend (Next.js + Nginx)
              └─ Serving on port 80/443

Databases & Services
  ├─ PostgreSQL (Neon Cloud)
  ├─ Redis (Caching)
  └─ Cloudinary (Images)

Users
  └─ Access via browser
     ├─ HTTPS encryption
     ├─ Token-based auth
     └─ Real-time updates
```

---

## Security Layers

```
Layer 1: HTTPS/TLS
  └─ Encrypted communication

Layer 2: Password Security
  └─ Hashed with bcrypt (one-way)

Layer 3: Authentication
  └─ JWT token with signature
  └─ Token verification on every request

Layer 4: Authorization
  └─ Role-based (super_admin, store_owner, etc.)

Layer 5: Tenant Isolation
  └─ tenantId on every table
  └─ WHERE tenantId filter on every query
  └─ Verify token.tenantId matches request

Layer 6: Input Validation
  └─ Parameterized queries (Prisma)
  └─ No SQL injection possible

Layer 7: Output Encoding
  └─ React auto-escapes values
  └─ No XSS possible

Layer 8: Audit Logging
  └─ All actions logged
  └─ Who did what and when

= FORTRESS MODE ✅
```

---

## Key Concepts Summary

| Concept | Meaning | Example |
|---------|---------|---------|
| **Tenant** | A store/business | Fresh Market |
| **Multi-Tenant** | One app, many stores | Grocio hosts 10 stores |
| **Row-Level Tenancy** | Data isolation via column | tenantId on every table |
| **JWT Token** | Proof of login | eyJhbGc... |
| **tenantId** | Isolates data | T1, T2, T3 |
| **Slug** | URL-friendly name | /store/fresh-market |
| **Role** | Permission level | customer, owner, admin |
| **CORS** | Allow cross-origin requests | Frontend can call backend |
| **Prisma** | Database ORM | Type-safe queries |
| **Neon** | Managed PostgreSQL | Cloud database |

---

## Scaling Plan

```
TODAY (1-5 stores)
  ├─ 1 EC2 instance for backend
  ├─ 1 EC2 instance for frontend
  ├─ 1 PostgreSQL database
  └─ Works perfectly

TOMORROW (100+ stores)
  ├─ Load balancer (distribute traffic)
  ├─ 3+ backend instances (scale horizontally)
  ├─ 3+ frontend instances (scale horizontally)
  ├─ PostgreSQL read replicas
  ├─ Redis cluster (distributed caching)
  └─ CDN for static assets

NO CHANGES NEEDED TO CODE!
Multi-tenancy architecture supports unlimited growth.
```

---

## Common Questions Answered

**Q: Can Store A see Store B's products?**
A: No! Database query filtered: WHERE tenantId='T1' (Store A only)

**Q: What if database is hacked?**
A: Even with full database access, hacker sees only one store's data per tenantId.

**Q: Can I add a new store easily?**
A: Yes! Just create new Tenant row. No code changes needed.

**Q: What happens when token expires?**
A: User redirected to login. Must re-authenticate. Creates new token.

**Q: How is password stored?**
A: Never stored plain. Hashed with bcrypt. Even developers can't see it.

**Q: How do I add a new store owner?**
A: Create User record with tenantId and role='store_owner'. They get own dashboard.

**Q: Is my data really isolated?**
A: Yes! 5 layers of isolation: URL validation, token verification, tenantId filtering, database constraints, audit logging.

---

## You've Built 🚀

✅ **Production-Grade SaaS Platform**
✅ **Proper Multi-Tenant Architecture**
✅ **Enterprise-Level Security**
✅ **Scalable Infrastructure**
✅ **Professional Codebase**
✅ **Live Deployment**

This is equivalent to platforms like Shopify, Stripe, or UberEats!

---

**Everything clear now? You fully understand Grocio! 🎉**
