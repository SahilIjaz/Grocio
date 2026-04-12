# 🚀 Next Phase Roadmap

## Phase 0 ✅ COMPLETE
Monorepo scaffolding, database schema, project configuration, and development environment setup.

---

## Phase 1 → BACKEND FIRST 🎯 (Auth Foundation)

### Why Backend First?

```
Your question was: "What will we be doing first - Frontend or Backend?"

ANSWER: BACKEND (Phase 1) → Then FRONTEND (Phases will progress in parallel after this)
```

### The Logic:

1. **Authentication is the gatekeeper** 🔐
   - Every API call needs JWT verification
   - Tenant isolation checks happen on every request
   - Frontend cannot even load without working auth endpoints

2. **Backend provides API contracts** 📋
   - Frontend needs real endpoints to call
   - Specifications for request/response formats
   - Error handling standards

3. **Risk mitigation first** 🛡️
   - Security bugs in auth affect everything
   - Easier to catch tenant isolation issues early
   - Foundation must be rock-solid

4. **Non-blocking parallel work** 🔄
   - While backend auth is being built, frontend can scaffold its UI components
   - Once auth APIs exist, frontend can integrate them
   - By Phase 3+, frontend and backend teams work in parallel

### Phase 1 Timeline (4-5 Days)

```
┌─ Backend Phase 1 (Auth) ─────────────────────┐
│                                              │
│  Day 1: Utilities & Error Handling          │
│  ├─ AppError hierarchy                      │
│  ├─ JWT utilities (sign, verify)            │
│  └─ Password hashing (bcrypt)               │
│                                              │
│  Day 2: Auth Module                         │
│  ├─ AuthRepository (Prisma queries)         │
│  ├─ AuthService (business logic)            │
│  ├─ AuthController (route handlers)         │
│  └─ Routes mounted                          │
│                                              │
│  Day 3: Middleware & Redis                  │
│  ├─ authenticate.ts                         │
│  ├─ resolveTenant.ts                        │
│  ├─ authorize.ts (RBAC)                     │
│  ├─ Redis services                          │
│  └─ Express app assembly                    │
│                                              │
│  Day 4: Database & Tests                    │
│  ├─ Prisma migration + seed                 │
│  ├─ Integration tests                       │
│  └─ End-to-end verification                 │
│                                              │
└──────────────────────────────────────────────┘
```

### What Gets Built in Phase 1

#### Backend (Express API)
```
POST   /api/v1/auth/register           ← Create account
POST   /api/v1/auth/login              ← Get JWT tokens
POST   /api/v1/auth/refresh            ← Refresh access token
POST   /api/v1/auth/logout             ← Invalidate tokens
GET    /api/v1/auth/me                 ← Get user profile

+ Full middleware pipeline:
  - JWT verification + token blacklist
  - Tenant context extraction (tenantId injection)
  - RBAC enforcement (roles: super_admin, store_admin, customer)
  - Input validation (Zod schemas)
  - Rate limiting (Redis-backed)
  - Error handling (structured error responses)
```

#### Frontend (Next.js UI - Can start in parallel)
```
While backend is being built, frontend can scaffold:

- Layout components (Header, Sidebar, Footer)
- Form components (LoginForm, RegisterForm)
- Auth pages (/auth/login, /auth/register)
- Basic storefront shell

These can be wired up to API endpoints once Phase 1 backend is complete.
```

---

## Build Order After Phase 1

```
Phase 1 ✅ (4-5 days)   → AUTH FOUNDATION
         ↓
Phase 2 (2-3 days)     → TENANT MANAGEMENT (Create store, suspend, activate)
         ↓
Phase 3 (4-5 days)     → PRODUCTS & SEARCH (Catalog, categories, image upload, Redis cache)
         ↓
Phase 4 (3-4 days)     → CART SYSTEM (Guest Redis, Auth cart, merge on login)
         ↓
Phase 5 (4-5 days)     → ORDER LIFECYCLE (Place order with atomic stock lock, state machine)
         ↓
Phase 6 (3-4 days)     → DASHBOARDS (Admin dashboards, audit logs, low-stock alerts)
         ↓
Phase 7 (3-4 days)     → HARDENING (Integration tests, security audit, load tests)
         ↓
Phase 8 (2-3 days)     → DEPLOYMENT (Docker, CI/CD, environment docs)
```

---

## Frontend Build Path (Parallel with Backend Phases 3+)

### Frontend Phases (Can start after Phase 1 backend is done)

```
Phase 1B (Frontend Foundation - Parallel with Phase 2)
├─ Create directory structure
├─ Install shadcn/ui components
├─ Set up Zustand stores (authStore, cartStore, tenantStore)
├─ Set up TanStack Query + Axios with interceptors
├─ Create middleware.ts for route guards
└─ Scaffold auth pages (login, register)

Phase 3B (Products UI - Parallel with Phase 3 backend)
├─ Create product listing page
├─ Product filters & search UI
├─ Product detail page
├─ Add image upload form

Phase 4B (Cart UI - Parallel with Phase 4 backend)
├─ Cart drawer component
├─ Cart item management
├─ Checkout form
└─ Cart merge on login

Phase 5B (Orders UI - Parallel with Phase 5 backend)
├─ Order history page
├─ Order detail with timeline
└─ Order status tracking

Phase 6B (Admin Dashboards - Parallel with Phase 6 backend)
├─ Store admin dashboard
├─ Admin product table
├─ Admin order management
├─ Super admin dashboard
└─ Audit logs view
```

---

## What You Start Building Tomorrow

### Starting Point for Phase 1: Backend Auth

```bash
# Step 1: Create src directory structure
apps/api/src/
├── config/               # Environment config, DB, Redis clients
├── middleware/           # Auth, tenant scope, validation, error handling
├── modules/
│   └── auth/            # First module to build
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.repository.ts
│       ├── auth.routes.ts
│       └── auth.schemas.ts  (Zod validators)
├── utils/               # Error classes, JWT, password, response helpers
├── types/
│   ├── express.d.ts     # Augment Express Request type
│   └── index.ts
├── app.ts               # Express factory with middleware pipeline
└── server.ts            # HTTP server startup

# Step 2: Create utility files first
utils/
├── AppError.ts          # Error hierarchy
├── asyncHandler.ts      # Async error wrapper
├── response.ts          # sendSuccess / sendError helpers
├── jwt.ts               # sign / verify tokens
└── password.ts          # bcrypt hash / compare

# Step 3: Create middleware files
middleware/
├── authenticate.ts      # JWT verification + blacklist check
├── resolveTenant.ts     # Extract tenantId from JWT
├── authorize.ts         # RBAC role checks
├── validate.ts          # Zod schema validation factory
├── rateLimiter.ts       # Redis-backed rate limiting
└── errorHandler.ts      # Global error middleware

# Step 4: Create auth module
modules/auth/
├── auth.repository.ts   # Prisma queries (findByEmail, createUser, etc.)
├── auth.service.ts      # Business logic (register, login, token handling)
├── auth.controller.ts   # Request parsing + response sending
├── auth.routes.ts       # Express Router with all endpoints
└── auth.schemas.ts      # Zod validators for request bodies

# Step 5: Wire it all up
app.ts                   # Express app with middleware pipeline + routers
server.ts                # Start listening on port 3001
```

---

## Summary: Your Answer

### Frontend or Backend? → **BACKEND**

✅ **Why?**
- Auth is the foundation everything depends on
- Defines API contracts for frontend to consume
- Catches security issues early
- Non-blocking — frontend can build in parallel after Phase 1

✅ **How?**
- Phase 1 (4-5 days) builds core auth APIs
- Phase 1B (parallel) starts frontend scaffolding
- Phase 2+ backend and frontend teams work in parallel
- By Phase 5, full system integration

✅ **What's Next?**
1. Set up Phase 1 development environment (Docker, pnpm install)
2. Create backend src directory structure
3. Build utility functions + error handling
4. Build auth module (register, login, JWT, refresh, logout)
5. Wire middleware pipeline
6. Write integration tests
7. Verify end-to-end auth flow

---

**Ready to start Phase 1? Let me know and we'll begin building the Auth Foundation! 🚀**

---

**Date:** April 12, 2026
**Phase 0 Status:** ✅ Complete
**Phase 1 Status:** Ready to begin
