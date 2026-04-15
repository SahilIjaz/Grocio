# ⚡ Grocio - Quick Reference

## 🚀 Start the App

```bash
pnpm dev
```

Web: http://localhost:3000  
API: http://localhost:3001

---

## 🔐 Quick Login

### Admin
```
Email:    admin@grocio.local
Password: SuperAdmin123!
→ Access: /admin
```

### Store Owner
```
Email:    owner@democore.local
Password: StoreAdmin123!
→ Access: /dashboard
```

### Customer
```
Email:    customer@example.local
Password: Customer123!
→ Access: / (homepage)
```

---

## 📋 Demo Data

**Store**: Demo Grocery Store  
**Products**: 3 (Apples, Milk, Chicken)  
**Categories**: 3 (Produce, Dairy, Meat)

---

## 🔄 User Signup

**Customer Signup**: → /auth/signup → Customer → Fill form → Redirects to login  
**Store Owner Signup**: → /auth/signup → Store Owner → Fill form → Redirects to dashboard

---

## 📍 Routes

| Path | Role | Status |
|------|------|--------|
| `/` | Customer | ✅ Homepage |
| `/auth/signup` | Public | ✅ Sign up |
| `/auth/login` | Public | ✅ Login |
| `/dashboard` | store_admin | ✅ Store dashboard |
| `/admin` | super_admin | ✅ Admin panel |

---

## 🛠️ Common Commands

```bash
# Start development
pnpm dev

# Seed database
npx ts-node apps/api/prisma/seed.ts

# Check API
curl http://localhost:3001/api/v1/health

# View users
sqlite3 apps/api/prisma/dev.db "SELECT email, role FROM User;"

# Kill stuck processes
pkill -9 node
```

---

## 🧪 Test Signup Flow

1. Go to http://localhost:3000/auth/signup
2. Choose account type (Customer or Store Owner)
3. Fill form
4. Click "Create Account"
5. For customers: Redirects to login
6. For store owners: Redirects directly to dashboard

---

## 📊 API Endpoints

```
POST   /api/v1/auth/login              # Login
POST   /api/v1/auth/register           # Signup
GET    /api/v1/health                  # Health check
GET    /api/v1/tenants                 # All stores
GET    /api/v1/tenants/:slug           # Store details
GET    /api/v1/tenants/:slug/products  # Store products
GET    /api/v1/tenants/:slug/categories # Store categories
```

---

## 🔐 Auth Examples

**Login Customer**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.local","password":"Customer123!"}'
```

**Signup Store**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"new@store.local",
    "password":"Pass123!",
    "firstName":"Jane","lastName":"Smith",
    "role":"store_admin",
    "storeName":"My Store",
    "storeSlug":"my-store"
  }'
```

---

## 📦 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Express, TypeScript, Bcrypt
- **Database**: SQLite, Prisma ORM
- **Security**: Bcrypt hashing, CORS, Helmet

---

## ✨ Key Features

✅ Multi-tenant architecture  
✅ Role-based access control  
✅ Secure password hashing (bcrypt)  
✅ Store owner dashboard  
✅ Admin panel  
✅ Product catalog  
✅ Shopping cart API  
✅ Order system API  

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `pkill -9 node && pnpm dev` |
| Login fails | Verify demo account exists: `sqlite3 apps/api/prisma/dev.db "SELECT email FROM User;"` |
| API not responding | Check: `curl http://localhost:3001/api/v1/health` |
| Dashboard shows login | Check localStorage (F12 → Application) for user data |

---

## 📚 Full Documentation

- **AUTH_FLOW.md** - Authentication flows
- **TESTING_GUIDE.md** - Test scenarios
- **VERIFICATION_REPORT.md** - Complete test results
- **SYSTEM_READY.md** - System overview
- **QUICK_REFERENCE.md** - This file

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-04-15
