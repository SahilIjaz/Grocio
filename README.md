# Grocio — Multi-Tenant Grocery Management System

A production-grade SaaS platform for independent grocery store owners to operate their online storefronts through a shared infrastructure with complete data isolation.

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router) + TypeScript
- TanStack Query + Zustand + React Hook Form
- shadcn/ui + Tailwind CSS
- Lucide Icons + Recharts

**Backend:**
- Node.js 20 LTS + Express.js
- PostgreSQL + Redis
- Prisma ORM
- JWT (RS256) Authentication

**Infrastructure:**
- Docker & Docker Compose (local dev)
- Turborepo Monorepo
- pnpm package manager

## 📂 Project Structure

```
grocio/
├── apps/
│   ├── api/          # Express.js backend (Phase 1-8)
│   └── web/          # Next.js frontend
├── packages/
│   └── types/        # Shared TypeScript types
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20 LTS
- pnpm 8+
- Docker & Docker Compose (for PostgreSQL + Redis)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL & Redis

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker ps
```

### 3. Set Up Environment Variables

**Backend:**
```bash
cp apps/api/.env.example apps/api/.env.local
```

**Frontend:**
```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Initialize Database (when Phase 0 completes)

```bash
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed initial data (super admin)
```

### 5. Run Development Servers

**All apps (parallel):**
```bash
pnpm dev
```

**Individual apps:**
```bash
pnpm --filter @grocio/api dev
pnpm --filter @grocio/web dev
```

## 📋 Development Phases

- **Phase 0** ✅ Project Scaffolding (monorepo, configs, schemas)
- **Phase 1** → Auth foundation (register, login, JWT, middleware)
- **Phase 2** → Tenant management (CRUD, suspend/activate)
- **Phase 3** → Product catalog (categories, products, images, search, Redis cache)
- **Phase 4** → Cart system (guest Redis cart, authenticated cart, merge on login)
- **Phase 5** → Order lifecycle (place, state machine, atomic stock decrement, cancel)
- **Phase 6** → Audit logs, rate limiting, dashboards
- **Phase 7** → Hardening, security audit, integration tests, load tests
- **Phase 8** → Docker, CI/CD, deployment prep

## 🔐 Security

- **Data Isolation:** `tenantId` FK + Prisma client extension guards against cross-tenant access
- **Authentication:** RS256 JWT with refresh token rotation + Redis blacklist (logout)
- **Password:** bcrypt cost factor 12
- **Transport:** HTTPS (TLS 1.2+) + HSTS headers + CORS + CSP
- **Input Validation:** Zod schema validation on all endpoints
- **Rate Limiting:** Redis-backed (login: 10 attempts/15 min, API: 200 req/min per IP)

## 🗂️ Database Schema

### Key Tables
- `tenants` — Store instances with settings and status
- `users` — Tenant users (super_admin, store_admin, customer)
- `products` — Per-tenant product catalog with images and stock
- `categories` — Hierarchical product categories per tenant
- `carts` — Authenticated user carts (guest carts in Redis)
- `cart_items` — Cart line items with price snapshots
- `orders` — Order lifecycle with state machine
- `order_items` — Order line items (product snapshots)
- `audit_logs` — Compliance audit trail
- `password_reset_tokens` — Secure password reset tokens

### Tenant Isolation
Every table (except `tenants` itself) has a `tenantId` foreign key. All queries enforce:
```sql
WHERE tenant_id = $1
```

Indexes are compound: `(tenant_id, field, ...)` to avoid collection scans.

## 🔄 API Design

**Base URL:** `/api/v1`

**Auth:**
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login (returns JWT + httpOnly refresh token)
- `POST /auth/refresh` — Refresh access token
- `POST /auth/logout` — Invalidate tokens
- `GET /auth/me` — Get current user profile

**Products (public):**
- `GET /products` — List with filters, search, pagination
- `GET /products/:id` — Single product detail

**Admin Routes:**
- `POST /products` — Create (store_admin)
- `PATCH /products/:id` — Update (store_admin)
- `DELETE /products/:id` — Soft-delete (store_admin)
- `PATCH /products/:id/stock` — Update stock (store_admin)

**Orders:**
- `POST /orders` — Place order (atomic stock decrement transaction)
- `GET /orders` — List orders (customer: own, admin: tenant-scoped)
- `PATCH /orders/:id/status` — Update status (store_admin)

**Cart (guest + auth):**
- `GET /cart` — Get cart (Redis for guest, PostgreSQL for auth)
- `POST /cart/items` — Add item
- `PATCH /cart/items/:productId` — Update quantity
- `DELETE /cart/items/:productId` — Remove item
- `POST /cart/merge` — Merge guest cart on login

## 📊 Redis Usage

| Use Case | Key Pattern | TTL |
|---|---|---|
| Guest cart | `guest_cart:{guestId}` | 7 days |
| Login rate limit | `rate_limit:login:{ip}` | 15 min |
| Token blacklist | `blacklist:jti:{jti}` | Token lifetime |
| Refresh family | `refresh_family:{userId}` | 7 days |
| Product cache | `cache:products:{tenantId}:{filters}` | 5 min |
| Category cache | `cache:categories:{tenantId}` | 30 min |

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Integration tests (api only)
pnpm --filter @grocio/api test:integration

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 🎨 Design System

**Color Scheme:**
- Primary: Deep Forest Green `#2D7A3A` (freshness, trust)
- Accent: Warm Amber `#F4A228` (CTAs, warmth)
- Danger: Red `#DC2626` (errors, out-of-stock)
- Warning: Amber `#D97706` (low stock alerts)
- Success: Green `#16A34A` (confirmations)

**Typography:**
- Headings: Plus Jakarta Sans (modern, friendly)
- Body: Inter (maximum legibility)
- Monospace: JetBrains Mono (SKU, IDs)

**Components:**
- Radix UI primitives for accessibility
- Tailwind CSS for styling
- Border radius: `0.75rem` for approachable cards
- Soft shadows for depth

## 🚢 Deployment

1. **Build:** `pnpm build`
2. **Docker:** Push Dockerfiles to registry
3. **Database:** Run `prisma migrate deploy` on production
4. **Environment:** Set production `.env` variables
5. **Start:** `docker-compose -f docker-compose.prod.yml up`

See `Dockerfile` (api + web) for containerization details.

## 📝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit with clear messages: `git commit -m "feat: description"`
3. Push and open a Pull Request
4. Ensure tests pass and linting is clean

## 📄 License

MIT — See LICENSE file

## 🤝 Support

For issues or questions, open a GitHub issue or contact the engineering team.

---

**Phase 0 Status:** ✅ Scaffolding complete — Ready for Phase 1 (Auth Foundation)