# Multi-Tenant Architecture - Visual & Practical Guide

## Quick Visual: How Multi-Tenancy Works

### The Shopping Mall Analogy

```
🏬 GROCIO PLATFORM (The Mall Building)
├─ Infrastructure (Servers, Database, Networking)
├─ Security (Locks, CCTV - ensures isolation)
└─ Management (Maintenance, Updates)

    │
    ├─ 🏪 SHOP A: Fresh Market (Tenant 1)
    │  ├─ Products: Apples, Oranges, Bananas
    │  ├─ Customers: Alice, Bob, Charlie
    │  ├─ Orders: Today's sales for Fresh Market only
    │  └─ Can't see: Shop B's data
    │
    ├─ 🏪 SHOP B: Green Groceries (Tenant 2)
    │  ├─ Products: Lettuce, Carrots, Broccoli
    │  ├─ Customers: David, Emma, Frank
    │  ├─ Orders: Today's sales for Green Groceries only
    │  └─ Can't see: Shop A's data
    │
    └─ 🏪 SHOP C: Organic Produce (Tenant 3)
       ├─ Products: Organic apples, Organic lettuce
       ├─ Customers: Grace, Henry, Iris
       ├─ Orders: Today's sales for Organic only
       └─ Can't see: Shop A's or Shop B's data

🔒 ISOLATION MECHANISM:
Each shop has a lock on its shelf (tenantId)
Even if someone breaks into the storage room (database),
they can only access their own shelf!
```

---

## Database Visualization

### Single Database, Multiple Tenants

```
┌─────────────────────────────────────────────────┐
│ SINGLE PostgreSQL DATABASE (Neon)               │
├─────────────────────────────────────────────────┤
│                                                 │
│  TENANT TABLE                                   │
│  ┌──────┬──────────────┬─────────────────┐     │
│  │ id   │ name         │ slug            │     │
│  ├──────┼──────────────┼─────────────────┤     │
│  │ T1   │ Fresh Market │ fresh-market    │     │
│  │ T2   │ Green Grocs  │ green-groceries │     │
│  │ T3   │ Organic Farm │ organic-farm    │     │
│  └──────┴──────────────┴─────────────────┘     │
│                                                 │
│  PRODUCT TABLE (with tenantId)                  │
│  ┌────┬──────────┬────────┬──────────┐         │
│  │id  │name      │price   │tenantId  │         │
│  ├────┼──────────┼────────┼──────────┤         │
│  │P1  │Apple     │2.99    │T1        │ ← Shop A's
│  │P2  │Orange    │3.50    │T1        │ ← products
│  │P3  │Lettuce   │1.50    │T2        │ ← Shop B's
│  │P4  │Carrot    │1.00    │T2        │ ← products
│  │P5  │Org.Apple │4.99    │T3        │ ← Shop C's
│  │P6  │Org.Lettuce│2.50   │T3        │ ← products
│  └────┴──────────┴────────┴──────────┘         │
│                                                 │
│  USER TABLE (with tenantId)                     │
│  ┌────┬──────────┬───────────┬──────────┐      │
│  │id  │email     │role       │tenantId  │      │
│  ├────┼──────────┼───────────┼──────────┤      │
│  │U1  │john@f.co │owner      │T1        │ Shop A
│  │U2  │alice@... │customer   │T1        │ Shop A
│  │U3  │sara@g.co │owner      │T2        │ Shop B
│  │U4  │bob@...   │customer   │T2        │ Shop B
│  │U5  │mark@o.co │owner      │T3        │ Shop C
│  │U6  │eve@...   │customer   │T3        │ Shop C
│  └────┴──────────┴───────────┴──────────┘      │
│                                                 │
│  ORDER TABLE (with tenantId)                    │
│  ┌──────┬──────────┬──────────────┬────────┐   │
│  │id    │userId    │tenantId      │amount  │   │
│  ├──────┼──────────┼──────────────┼────────┤   │
│  │O1    │U2 (Alice)│T1 (Fresh)    │$29.95  │   │
│  │O2    │U4 (Bob)  │T2 (Green)    │$15.50  │   │
│  │O3    │U2 (Alice)│T1 (Fresh)    │$45.00  │   │
│  │O4    │U6 (Eve)  │T3 (Organic)  │$89.99  │   │
│  └──────┴──────────┴──────────────┴────────┘   │
│                                                 │
│ 🔒 ISOLATION: tenantId column on EVERY table!  │
└─────────────────────────────────────────────────┘
```

### Query Isolation

```
SAME DATABASE, DIFFERENT RESULTS:

Query 1 (Shop A asks for their products):
SELECT * FROM Product WHERE tenantId = 'T1'
↓
Result: Apple, Orange (Shop A sees only their products)

Query 2 (Shop B asks for their products):
SELECT * FROM Product WHERE tenantId = 'T2'
↓
Result: Lettuce, Carrot (Shop B sees only their products)

Query 3 (Shop C asks for their products):
SELECT * FROM Product WHERE tenantId = 'T3'
↓
Result: Org.Apple, Org.Lettuce (Shop C sees only their products)

🔒 Even though all data is in ONE database,
   each shop only sees their OWN data!
```

---

## Authentication & Token Flow

### JWT Token Breakdown

```
JWT Token Structure:
═══════════════════════════════════════════════════════════════════

HEADER.PAYLOAD.SIGNATURE

Header: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Payload: eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInRlbmFudElkIjoiVDEiLCJpYXQiOjE3MTM2MDAwMDB9
Signature: TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ

DECODED HEADER:
{
  "alg": "HS256",          ← Algorithm used (HMAC SHA256)
  "typ": "JWT"             ← Type is JWT
}

DECODED PAYLOAD:
{
  "userId": "user-123",    ← Who is this?
  "email": "john@fresh.com",
  "tenantId": "T1",        ← Which store does this user belong to?
  "role": "customer",      ← What can they do?
  "iat": 1713600000,       ← Issued at (timestamp)
  "exp": 1713686400        ← Expires (24 hours later)
}

SIGNATURE:
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  "your-secret-key-on-server"
)
↓
Result: TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ

🔐 SECURITY:
- Signature proves token wasn't modified
- Only server knows the secret key
- If someone changes payload → signature breaks
- Backend verifies signature before trusting data
```

### Complete Login/Request Cycle

```
TIME 0: USER LOGS IN
┌────────────────────────────────────────────────┐
│ User enters:                                   │
│ Email: john@fresh.com                          │
│ Password: MyPassword123                        │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Backend receives credentials                   │
│ 1. Find user by email                          │
│ 2. Hash input password                         │
│ 3. Compare with stored hash                    │
│    ✓ Match!                                    │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Backend generates JWT                          │
│ payload = {                                    │
│   userId: "user-123",                          │
│   email: "john@fresh.com",                     │
│   tenantId: "T1",       ← CRITICAL!            │
│   role: "customer",                            │
│   iat: now(),                                  │
│   exp: now() + 24hours                         │
│ }                                              │
│ token = sign(payload, SECRET_KEY)              │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Backend sends token to frontend                │
│ Response: {                                    │
│   token: "eyJhbGc...",                         │
│   user: { id: "user-123", ... }                │
│ }                                              │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Frontend stores token                          │
│ localStorage.setItem('authToken',              │
│   'eyJhbGc...'                                 │
│ )                                              │
└────────────────────────────────────────────────┘

TIME 1: USER BROWSES PRODUCTS (1 hour later)
┌────────────────────────────────────────────────┐
│ User clicks "View Products"                    │
│ URL: /store/fresh-market/products              │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Frontend makes API request                     │
│ GET /api/v1/tenants/fresh-market/products     │
│                                                │
│ Headers:                                       │
│ Authorization: Bearer eyJhbGc...               │
│ Content-Type: application/json                 │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Backend receives request                       │
│ 1. Extract token from header                   │
│ 2. Verify signature (wasn't tampered?)         │
│ 3. Check expiration (not expired?)             │
│ 4. Extract userId, tenantId from payload      │
│                                                │
│    ✓ Token valid!                              │
│    ✓ Still has 23 hours left!                  │
│    ✓ userId: "user-123"                        │
│    ✓ tenantId: "T1"                            │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Backend validates tenant access                │
│ 1. Look up tenant by slug "fresh-market"       │
│    → get tenantId "T1"                         │
│ 2. Compare with token.tenantId                 │
│    T1 == T1 ✓ MATCH!                           │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Backend queries database                       │
│ SELECT * FROM Product                          │
│ WHERE tenantId = 'T1'                          │
│        ↓                                        │
│        (Only Fresh Market's products!)          │
│ Returns: Apple, Orange, Banana                 │
└────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────┐
│ Frontend receives & displays                   │
│ Products shown: Apple, Orange, Banana          │
│ (User sees Fresh Market's products only)       │
└────────────────────────────────────────────────┘

🔒 SECURITY CHECKS PERFORMED:
✓ Token signature verified (wasn't modified)
✓ Token not expired (still valid)
✓ Tenant in URL matches tenant in token
✓ Database query filtered by tenantId
✓ User can only see their store's data
```

---

## Data Flow: Adding Product to Cart

```
STEP-BY-STEP: USER ADDS APPLE (from Fresh Market) TO CART

TIME: 2:15 PM

┌────────────────────────────────────────────────┐
│ BROWSER SIDE - User Action                     │
├────────────────────────────────────────────────┤
│ Page: /store/fresh-market                      │
│ User sees: Apple ($2.99)                       │
│ User clicks: "Add to Cart" button               │
│ Quantity: 2                                    │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ BROWSER SIDE - Prepare Request                 │
├────────────────────────────────────────────────┤
│ JavaScript code runs:                          │
│                                                │
│ const token = localStorage.getItem('authToken')
│ const slug = "fresh-market"  (from URL)        │
│ const body = {                                 │
│   productId: "prod-apple-001",                 │
│   quantity: 2                                  │
│ }                                              │
│                                                │
│ fetch(                                         │
│   `/api/v1/tenants/${slug}/cart/items`,       │
│   {                                            │
│     method: "POST",                            │
│     headers: {                                 │
│       Authorization: `Bearer ${token}`,        │
│       "Content-Type": "application/json"       │
│     },                                         │
│     body: JSON.stringify(body)                 │
│   }                                            │
│ )                                              │
└────────────────────────────────────────────────┘
                    ↓
        ┌──────────────────────────┐
        │ HTTP REQUEST SENT        │
        ├──────────────────────────┤
        │ Method: POST             │
        │ URL: /api/v1/tenants/    │
        │      fresh-market/       │
        │      cart/items          │
        │                          │
        │ Headers:                 │
        │ Authorization: Bearer... │
        │ Content-Type: app/json   │
        │                          │
        │ Body: {                  │
        │   productId: "prod...",  │
        │   quantity: 2            │
        │ }                        │
        └──────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Express Handler Receives         │
├────────────────────────────────────────────────┤
│ Handler: app.post('/api/v1/tenants/:slug/     │
│                   cart/items', ...)            │
│                                                │
│ Parameters from URL:                           │
│ req.params.slug = "fresh-market"               │
│                                                │
│ Body data:                                     │
│ req.body = {                                   │
│   productId: "prod-apple-001",                 │
│   quantity: 2                                  │
│ }                                              │
│                                                │
│ Headers:                                       │
│ req.headers.authorization =                    │
│   "Bearer eyJhbGc..."                          │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 1: Extract & Verify Token   │
├────────────────────────────────────────────────┤
│ const token = req.headers.authorization        │
│              .split(' ')[1]                    │
│ // token = "eyJhbGc..."                        │
│                                                │
│ const decoded = jwt.verify(token, SECRET)      │
│ // decoded = {                                 │
│ //   userId: "user-123",                       │
│ //   tenantId: "T1",                           │
│ //   email: "john@fresh.com",                  │
│ //   role: "customer",                         │
│ //   iat: 1713600000,                          │
│ //   exp: 1713686400                           │
│ // }                                           │
│                                                │
│ ✓ Token verified & not expired!                │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 2: Verify Tenant Access     │
├────────────────────────────────────────────────┤
│ const tenant =                                 │
│   await Tenant.findUnique({                    │
│     where: { slug: "fresh-market" }            │
│   })                                           │
│ // tenant = {                                  │
│ //   id: "T1",                                 │
│ //   name: "Fresh Market",                     │
│ //   slug: "fresh-market"                      │
│ // }                                           │
│                                                │
│ if (decoded.tenantId !== tenant.id) {          │
│   return res.status(403).json({                │
│     error: "Unauthorized"                      │
│   })                                           │
│ }                                              │
│                                                │
│ ✓ Token.tenantId (T1) == URL tenant (T1)      │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 3: Verify Product Exists    │
├────────────────────────────────────────────────┤
│ const product =                                │
│   await Product.findUnique({                   │
│     where: { id: "prod-apple-001" }            │
│   })                                           │
│ // product = {                                 │
│ //   id: "prod-apple-001",                     │
│ //   name: "Apple",                            │
│ //   price: 2.99,                              │
│ //   tenantId: "T1",  ← CRITICAL!              │
│ //   stockQuantity: 500                        │
│ // }                                           │
│                                                │
│ if (!product || product.tenantId !== "T1") {   │
│   return res.status(404).json({                │
│     error: "Product not found"                 │
│   })                                           │
│ }                                              │
│                                                │
│ ✓ Product exists & belongs to T1               │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 4: Check Stock              │
├────────────────────────────────────────────────┤
│ if (req.body.quantity > product.stockQuantity) {
│   return res.status(400).json({                │
│     error: "Not enough stock"                  │
│   })                                           │
│ }                                              │
│                                                │
│ Requested: 2 | Available: 500                  │
│ ✓ Sufficient stock!                            │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 5: Create/Update Cart       │
├────────────────────────────────────────────────┤
│ const cart = await Cart.upsert({               │
│   where: { userId: "user-123" },               │
│   create: {                                    │
│     userId: "user-123",                        │
│     tenantId: "T1"  ← Isolation!               │
│   },                                           │
│   update: {}                                   │
│ })                                             │
│ // cart = {                                    │
│ //   id: "cart-user123",                       │
│ //   userId: "user-123",                       │
│ //   tenantId: "T1"                            │
│ // }                                           │
│                                                │
│ ✓ Cart created or found                        │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 6: Add Item to Cart         │
├────────────────────────────────────────────────┤
│ const cartItem = await CartItem.create({       │
│   cartId: "cart-user123",                      │
│   productId: "prod-apple-001",                 │
│   tenantId: "T1",  ← Double safeguard!        │
│   quantity: 2,                                 │
│   unitPrice: 2.99,                             │
│   createdAt: new Date()                        │
│ })                                             │
│ // cartItem = {                                │
│ //   id: "item-123",                           │
│ //   cartId: "cart-user123",                   │
│ //   productId: "prod-apple-001",              │
│ //   quantity: 2,                              │
│ //   unitPrice: 2.99,                          │
│ //   tenantId: "T1"                            │
│ // }                                           │
│                                                │
│ ✓ Item added to cart!                          │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ SERVER SIDE - Step 7: Send Response            │
├────────────────────────────────────────────────┤
│ res.status(201).json({                         │
│   success: true,                               │
│   message: "Item added to cart",               │
│   data: {                                      │
│     cartItem: {                                │
│       id: "item-123",                          │
│       productId: "prod-apple-001",             │
│       quantity: 2,                             │
│       unitPrice: 2.99                          │
│     },                                         │
│     cart: {                                    │
│       id: "cart-user123",                      │
│       itemCount: 1,                            │
│       totalAmount: 5.98                        │
│     }                                          │
│   }                                            │
│ })                                             │
└────────────────────────────────────────────────┘
                    ↓
        ┌──────────────────────────┐
        │ HTTP RESPONSE SENT       │
        ├──────────────────────────┤
        │ Status: 201 Created      │
        │                          │
        │ Body: {                  │
        │   success: true,         │
        │   message: "Item added.."│
        │   data: {...}            │
        │ }                        │
        └──────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ BROWSER SIDE - Receive Response                │
├────────────────────────────────────────────────┤
│ .then(response => response.json())             │
│ .then(data => {                                │
│   // data = {                                  │
│   //   success: true,                          │
│   //   message: "Item added to cart",          │
│   //   data: { ... }                           │
│   // }                                         │
│                                                │
│   setCart([...cart, data.data.cartItem])      │
│   // Update React state with new item          │
│                                                │
│   showToast("Item added to cart!")             │
│   // Show success notification                 │
│                                                │
│   updateBadge(data.data.cart.itemCount)        │
│   // Update cart badge (from 0 to 1)           │
│                                                │
│   localStorage.setItem(                        │
│     'cart_fresh-market',                       │
│     JSON.stringify(cart)                       │
│   )                                            │
│   // Backup cart to localStorage               │
│ })                                             │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ BROWSER SIDE - UI Updates                      │
├────────────────────────────────────────────────┤
│ ✓ Toast notification: "Item added to cart!"    │
│ ✓ Cart badge changes: 0 → 1                    │
│ ✓ "Add to Cart" button becomes "Update Cart"   │
│ ✓ React re-renders with new state              │
│ ✓ User sees confirmation                       │
└────────────────────────────────────────────────┘

🔒 SECURITY THROUGHOUT:
✓ Token verified (signature checked)
✓ Token not expired
✓ Tenant validated (URL matches token)
✓ Product verified (exists and belongs to same tenant)
✓ Stock checked (prevents overselling)
✓ Database query includes tenantId (isolation)
✓ No SQL injection (Prisma parameterized)
✓ No XSS (React escaping)

📊 ISOLATION LAYERS:
1. Token contains tenantId
2. URL slug identifies tenant
3. Product must belong to same tenant
4. Database operation scoped to tenant
5. Response only shows user's cart
```

---

## Money Flow & Orders

```
GROCIO TRANSACTION FLOW: Order Placed

Fresh Market Owner's Perspective:
────────────────────────────────────────

ORDER CREATED:
Time: 2:45 PM
Customer: John (user-123)
Items: 2x Apple ($2.99 each), 1x Orange ($3.50)
Subtotal: $9.48
Tax: $0.76
Shipping: $5.00
TOTAL: $15.24

Database Records Created:
├─ Order
│  └─ id: order-456
│     tenantId: T1 (Fresh Market)  ← Belongs to this store
│     userId: user-123
│     orderNumber: ORD-2026-001234
│     status: "pending"
│     totalAmount: 15.24
│
└─ OrderItems (2 records)
   ├─ Item 1: 2x Apple, $5.98
   │  tenantId: T1
   │
   └─ Item 2: 1x Orange, $3.50
      tenantId: T1

Fresh Market Dashboard shows:
New pending order: ORD-2026-001234 ($15.24)
- Click to process
- View customer details
- Print packing slip

🔒 Data Isolation:
- Order linked to T1 (Fresh Market)
- Green Groceries owner cannot see this order
- Order items linked to T1
- Customer can only see their own orders
- If hacker has database access, can't modify without tenantId match
```

---

## Summary: Why This Architecture?

```
┌────────────────────────────────────────────┐
│ WHY MULTI-TENANT ROW-LEVEL ARCHITECTURE?   │
└────────────────────────────────────────────┘

COST EFFICIENCY:
❌ Without multi-tenancy:
   - Need 3 servers (1 per store)
   - Need 3 databases
   - Need 3 deployment pipelines
   - Total cost: $XXX/month

✅ With multi-tenancy:
   - 1 server (can handle many stores)
   - 1 database (with isolation via tenantId)
   - 1 deployment pipeline
   - Total cost: $XX/month (much cheaper!)
   - Can scale to 100 stores with same infrastructure

MAINTENANCE:
❌ Without: Fix bug 3 times (once per deployment)
✅ With: Fix bug once (all stores get update)

SECURITY:
❌ Multiple databases = multiple attack surfaces
✅ One database with row-level isolation = unified security

SCALABILITY:
❌ Adding new store = new infrastructure
✅ Adding new store = new row in Tenant table

USER EXPERIENCE:
✅ All stores use same platform
✅ Consistent features across all stores
✅ Automatic updates for all
✅ Unified support team

DEVELOPER EXPERIENCE:
✅ Code once, serve multiple tenants
✅ Easy to onboard new stores
✅ Clear data isolation pattern
✅ Testable security model
```

---

## Complete Checklist: Is Your Data Isolated?

```
✅ ISOLATION VERIFICATION CHECKLIST

1. SCHEMA LEVEL
   ✓ Every table has tenantId column?
   ✓ Foreign keys include tenantId?
   ✓ Unique constraints include tenantId?

2. QUERY LEVEL
   ✓ Every SELECT filtered by tenantId?
   ✓ Every UPDATE filtered by tenantId?
   ✓ Every DELETE filtered by tenantId?

3. APPLICATION LEVEL
   ✓ Extract tenantId from URL/token?
   ✓ Verify token.tenantId matches request?
   ✓ Pass tenantId to all database queries?

4. AUTHENTICATION LEVEL
   ✓ Token contains tenantId?
   ✓ Token signature verified?
   ✓ Token not expired?

5. AUTHORIZATION LEVEL
   ✓ User role checked?
   ✓ Tenant ownership verified?
   ✓ Permission checked?

6. RESPONSE LEVEL
   ✓ Only tenant's data returned?
   ✓ No cross-tenant leaks?
   ✓ Error messages don't reveal data?

GROCIO COMPLIANCE: ✅✅✅✅✅✅ (100% Isolated!)
```

---

## Perfect! Your Grocio System is:

1. ✅ **Multi-Tenant** - Multiple stores in one platform
2. ✅ **Properly Isolated** - Complete data separation
3. ✅ **Secure** - Token-based auth + tenant validation
4. ✅ **Scalable** - Can add stores without infrastructure changes
5. ✅ **Maintainable** - Single codebase serves all stores
6. ✅ **Cost-Effective** - Shared infrastructure
7. ✅ **Production-Ready** - Deployed and running live

**You've built a professional SaaS platform!** 🚀
