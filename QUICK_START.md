# ⚡ Quick Start Guide

## Phase 0 Status: ✅ COMPLETE

All scaffolding, configurations, and schemas are ready. You can now start Phase 1 (Backend Auth).

---

## 📋 What's Been Created

### Monorepo Structure
```
grocio/                           ← Root project
├── apps/
│   ├── api/                      ← Express.js backend
│   │   ├── src/                  ← To be created in Phase 1
│   │   ├── prisma/
│   │   │   └── schema.prisma     ✅ (10 tables defined)
│   │   ├── tsconfig.json         ✅
│   │   └── package.json          ✅
│   └── web/                      ← Next.js frontend
│       ├── app/                  ← To be created in Phase 1B
│       ├── components/           ← To be created in Phase 1B
│       ├── tsconfig.json         ✅
│       ├── next.config.ts        ✅
│       ├── tailwind.config.ts    ✅
│       └── package.json          ✅
├── packages/
│   └── types/
│       ├── src/
│       │   └── index.ts          ✅ (All TypeScript interfaces)
│       ├── tsconfig.json         ✅
│       └── package.json          ✅
├── docker-compose.yml            ✅ (PostgreSQL + Redis)
├── pnpm-workspace.yaml           ✅
├── turbo.json                    ✅
├── package.json                  ✅
├── .eslintrc.json                ✅
├── .prettierrc.json              ✅
├── .lintstagedrc.json            ✅
├── .gitignore                    ✅
├── README.md                     ✅
├── PHASE_0_SUMMARY.md            ✅
├── NEXT_PHASE_ROADMAP.md         ✅
└── QUICK_START.md                ✅ (this file)
```

---

## 🔧 One-Time Setup (Run These Commands)

### 1. Install Dependencies
```bash
cd /Users/sahilijaz/Desktop/Grocio
pnpm install
```

### 2. Start Docker Services (PostgreSQL + Redis)
```bash
docker-compose up -d

# Verify they're running
docker ps
```

### 3. Create `.env.local` Files
**Backend:**
```bash
cp apps/api/.env.example apps/api/.env.local
```

**Frontend:**
```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Generate Prisma Client (When ready to run Phase 1)
```bash
pnpm --filter @grocio/api prisma generate
```

---

## 🎯 What to Build Next: Phase 1 (Backend Auth)

### File Structure to Create
```
apps/api/src/
├── config/
│   ├── index.ts              ← Environment validation
│   ├── database.ts           ← Prisma client
│   └── redis.ts              ← Redis client
├── middleware/
│   ├── authenticate.ts       ← JWT verification
│   ├── resolveTenant.ts      ← Tenant context
│   ├── authorize.ts          ← RBAC checks
│   ├── validate.ts           ← Zod validation
│   ├── rateLimiter.ts        ← Rate limiting
│   └── errorHandler.ts       ← Global error handler
├── modules/
│   └── auth/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.repository.ts
│       ├── auth.routes.ts
│       └── auth.schemas.ts
├── services/
│   └── redis/
│       ├── tokenBlacklist.ts
│       └── refreshFamily.ts
├── utils/
│   ├── AppError.ts
│   ├── asyncHandler.ts
│   ├── response.ts
│   ├── jwt.ts
│   └── password.ts
├── types/
│   ├── express.d.ts
│   └── index.ts
├── app.ts                    ← Express factory
└── server.ts                 ← Entry point

prisma/
├── migrations/
│   └── init/                 ← Auto-created by Prisma
└── seed.ts                   ← Seed super_admin user
```

### Core Files to Create First (Priority Order)

**Day 1 - Utilities & Error Handling:**
1. `src/utils/AppError.ts` — Error hierarchy
2. `src/utils/asyncHandler.ts` — Error wrapper for async handlers
3. `src/utils/response.ts` — Success/error response helpers
4. `src/utils/jwt.ts` — Token sign/verify logic
5. `src/utils/password.ts` — bcrypt hashing

**Day 2 - Auth Module:**
6. `src/modules/auth/auth.schemas.ts` — Zod validators
7. `src/modules/auth/auth.repository.ts` — Prisma queries
8. `src/modules/auth/auth.service.ts` — Business logic
9. `src/modules/auth/auth.controller.ts` — Route handlers
10. `src/modules/auth/auth.routes.ts` — Express Router

**Day 3 - Middleware & Assembly:**
11. `src/middleware/authenticate.ts` — JWT + blacklist check
12. `src/middleware/resolveTenant.ts` — Tenant extraction
13. `src/middleware/authorize.ts` — RBAC enforcement
14. `src/middleware/validate.ts` — Zod schema validator
15. `src/middleware/rateLimiter.ts` — Rate limiting
16. `src/middleware/errorHandler.ts` — Global error handler
17. `src/config/index.ts` — Environment variables + validation
18. `src/config/database.ts` — Prisma client instance
19. `src/config/redis.ts` — Redis client instance
20. `src/app.ts` — Express app factory with middleware pipeline
21. `src/server.ts` — HTTP server startup

**Day 4 - Database & Tests:**
22. `prisma/seed.ts` — Seed super_admin user
23. Run `pnpm db:push` and `pnpm db:seed`
24. Write integration tests for auth flow
25. Verify end-to-end functionality

---

## 🚀 To Start Development

### Setup Once:
```bash
# Install dependencies
pnpm install

# Start Docker services
docker-compose up -d

# Create env files
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

### Every Development Session:
```bash
# Start both apps (in parallel)
pnpm dev

# Or individual apps:
pnpm --filter @grocio/api dev       # Backend on :3001
pnpm --filter @grocio/web dev       # Frontend on :3000
```

### Database Commands:
```bash
# Create a new migration (after schema changes)
pnpm db:migrate

# Push schema (no migrations)
pnpm db:push

# Seed initial data
pnpm db:seed

# Open Prisma Studio (GUI)
pnpm db:studio
```

### Code Quality:
```bash
# Lint all code
pnpm lint

# Format code
pnpm --filter @grocio/api format
pnpm --filter @grocio/web format

# Type checking
pnpm type-check

# Run tests
pnpm test
```

---

## ✅ Phase 1 Deliverables Checklist

### Backend Auth APIs
- [ ] `POST /api/v1/auth/register` — Create new user account
- [ ] `POST /api/v1/auth/login` — Authenticate and get JWT
- [ ] `POST /api/v1/auth/refresh` — Refresh expired access token
- [ ] `POST /api/v1/auth/logout` — Invalidate tokens
- [ ] `POST /api/v1/auth/forgot-password` — Initiate password reset
- [ ] `POST /api/v1/auth/reset-password` — Complete password reset
- [ ] `GET /api/v1/auth/me` — Get current user profile

### Middleware Layer
- [ ] JWT verification with token blacklist check
- [ ] Tenant context extraction (tenantId from JWT)
- [ ] RBAC enforcement (role-based access control)
- [ ] Input validation (Zod schemas)
- [ ] Rate limiting (login: 10/15min, API: 200/min)
- [ ] Global error handling with structured responses

### Database & Seeding
- [ ] Run Prisma migration (create all 10 tables)
- [ ] Seed super_admin user
- [ ] Verify indexes are created
- [ ] Test tenant isolation (queries filter by tenantId)

### Testing
- [ ] Register flow test
- [ ] Login flow test
- [ ] JWT verification test
- [ ] Token refresh test
- [ ] Logout + blacklist test
- [ ] RBAC enforcement test
- [ ] Rate limit test

### Verification
- [ ] API runs on `http://localhost:3001`
- [ ] All endpoints return consistent error format
- [ ] JWT tokens contain correct claims (sub, tenantId, role, jti)
- [ ] Tenant isolation works (queries scoped by tenantId)
- [ ] Rate limiting blocks excess requests
- [ ] Token blacklist prevents reuse after logout

---

## 📊 Database Tables (Ready in Prisma Schema)

All 10 tables are defined in `apps/api/prisma/schema.prisma`:

1. **tenants** — Store instances with settings
2. **users** — Tenant users (super_admin, store_admin, customer)
3. **categories** — Hierarchical product categories per tenant
4. **products** — Product catalog with stock, images, tags
5. **carts** — Authenticated user carts (guest carts in Redis)
6. **cart_items** — Cart line items with price snapshots
7. **orders** — Order lifecycle with state machine
8. **order_items** — Order line items (product snapshots)
9. **password_reset_tokens** — Secure password reset tokens
10. **audit_logs** — Compliance audit trail

**Key Security Features:**
- `tenantId` foreign key on every table (except tenants)
- Compound indexes: `(tenantId, other_fields...)` for efficient scoped queries
- Unique constraints per tenant (e.g., email, SKU, slug)
- Enums for types (UserRole, TenantStatus, OrderStatus, AuditAction)

---

## 🔐 Security Built-In

✅ Tenant Isolation
- Every query scoped by `tenantId` at the repository layer
- Prisma client extension as defence-in-depth

✅ Authentication
- RS256 JWT (asymmetric, private key never shared)
- Access token: 1 hour TTL
- Refresh token: 7 days TTL (httpOnly cookie)
- Token rotation on refresh

✅ Password Security
- bcrypt cost factor 12
- Never stored in plaintext
- Never logged

✅ Rate Limiting
- Login: 10 attempts per 15 minutes per IP (429 response)
- API: 200 requests per minute per IP

✅ Input Validation
- Zod schemas on all endpoints
- Type-safe at both runtime and compile time

✅ Error Handling
- Never leak stack traces to clients
- Consistent error response format
- Structured logging (entity, action, old/new values)

---

## 📖 Documentation Files

- **README.md** — Project overview, getting started, architecture
- **PHASE_0_SUMMARY.md** — What was completed in Phase 0
- **NEXT_PHASE_ROADMAP.md** — Phase 1-8 timeline and build order
- **QUICK_START.md** — This file; how to run and what's next

---

## 🆘 Troubleshooting

### Docker not starting?
```bash
# Check if ports 5432 (PostgreSQL) and 6379 (Redis) are available
lsof -i :5432
lsof -i :6379

# Stop conflicting services or change docker-compose ports
```

### pnpm install fails?
```bash
# Update pnpm
npm install -g pnpm@latest

# Clear cache and reinstall
pnpm install --force
```

### Prisma migration issues?
```bash
# Reset database (dev only!)
pnpm --filter @grocio/api prisma migrate reset

# Or push schema without migration
pnpm --filter @grocio/api prisma db push
```

---

## 🎬 Ready to Start?

### Next Command:
```bash
# Phase 1 begins here!
# Follow the file structure in the "What to Build Next" section
```

**Timeline:** 4-5 days for Phase 1 (Auth Foundation)

**Expected Outcome:** Working JWT auth API with proper tenant isolation and RBAC

---

**Phase 0 Complete** ✅  
**Phase 1 Ready** 🚀  
**Let's build! 💪**
