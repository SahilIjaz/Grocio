# 🔐 Grocio - Complete Authentication & User Flow

## Complete User Journey After Sign Up/Login

---

## 👤 **CUSTOMER FLOW**

### **Sign Up as Customer**
1. Go to http://localhost:3000/auth/signup
2. Click "Customer"
3. Fill in: First Name, Last Name, Email, Password
4. Click "Create Account"
5. **Redirects to** → `/auth/login`
6. Login with your credentials
7. **Redirects to** → Home page `/` (customer dashboard)

### **What Customers Can Do**
- ✅ Browse all stores on homepage
- ✅ Click on a store to view products
- ✅ Filter products by category
- ✅ Add items to cart
- ✅ Checkout and place orders
- ✅ View order confirmation

**Demo Customer Account:**
```
Email: customer@example.local
Password: Customer123!
```

---

## 🏪 **STORE OWNER FLOW** (FIXED!)

### **Sign Up as Store Owner** ✅ NOW WORKING
1. Go to http://localhost:3000/auth/signup
2. Click "Store Owner" (🏪)
3. Fill in:
   - First Name
   - Last Name
   - Email
   - Store Name (e.g., "My Fresh Market")
   - Store URL Slug (e.g., "my-fresh-market")
   - Password
4. Click "Create Account"
5. **API Creates:**
   - ✅ New Tenant (Store) in database
   - ✅ User with `store_admin` role
   - ✅ Links user to tenant
6. **Redirects to** → `/dashboard` (Store Owner Dashboard)

### **After Sign Up - Store Owner Dashboard**
You'll see the **Store Management Dashboard** with tabs:

#### **📊 Overview Tab**
- Key metrics: Products count, Orders count, Revenue, Categories
- Quick action buttons to add products/categories
- System status

#### **📦 Products Tab**
- List of all products
- Add new product button
- Edit existing products
- Delete products
- Manage pricing and stock

#### **🏷️ Categories Tab**
- View all product categories
- Add new category
- Edit category details
- Delete categories

#### **🛒 Orders Tab**
- View all customer orders
- Order details
- Order status tracking

#### **📈 Inventory Tab**
- Track stock levels
- Low stock alerts
- Inventory management

#### **⚙️ Settings Tab**
- Store name configuration
- Store slug (URL)
- Contact email
- Store settings

### **Sign In as Store Owner** ✅ NOW WORKING
1. Go to http://localhost:3000/auth/login
2. Enter:
   ```
   Email: owner@democore.local
   Password: StoreAdmin123!
   ```
3. Click "Sign In"
4. **Detects role** = `store_admin`
5. **Redirects to** → `/dashboard` (automatically!)

**Demo Store Owner Account:**
```
Email: owner@democore.local
Password: StoreAdmin123!
Owns: Demo Grocery Store (slug: demo-grocery)
```

---

## 👑 **ADMIN FLOW**

### **Sign Up as Admin**
Not available to new users - Admin accounts are pre-seeded only.

### **Sign In as Admin** ✅ WORKING
1. Go to http://localhost:3000/auth/login
2. Enter:
   ```
   Email: admin@grocio.local
   Password: SuperAdmin123!
   ```
3. Click "Sign In"
4. **Detects role** = `super_admin`
5. **Redirects to** → `/admin` (Admin Panel)

### **Admin Panel Features**
- View all stores (tenants)
- Create new stores
- Manage all users
- View system analytics
- Configure system settings
- Monitor platform activity

**Demo Admin Account:**
```
Email: admin@grocio.local
Password: SuperAdmin123!
```

---

## 🔄 **Complete Authentication Flow Diagram**

```
┌─────────────────────────────────────────────────────────┐
│                    HOME PAGE (/)                        │
│        Browse stores, features, demo accounts           │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
  ┌─────────┐      ┌──────────┐
  │ Sign Up │      │  Sign In │
  └────┬────┘      └────┬─────┘
       │                │
       │ accountType    │ email/password
       │ selection      │
       │                │
   ┌───┴────┬──────┐    │
   ▼        ▼      ▼    │
┌──────┐ ┌────┐ ┌──┐   │
│Cust. │ │Shop│ │N/A│  │
└──┬───┘ └─┬──┘ └──┘   │
   │       │           │
   │ API   │ API       │ API
   │ calls │ calls     │ login
   │       │           │
   │ ✅    │ ✅        │ ✅
   │ User  │ User +    │ Get user
   │ create│ Tenant    │ with role
   │       │ created   │
   │       │           │
   ▼       ▼           ▼
┌────────────┐        ┌─────────────┐
│ Login page │        │ Detect role │
│ (redirect) │        │ from user   │
└────┬───────┘        └──────┬──────┘
     │                       │
     │ email/pass            │
     │                   ┌───┼────┬──────────┐
     │                   │   │    │          │
     │                   ▼   ▼    ▼          ▼
     │              customer store admin  super_admin
     │                │       │     │         │
     └────────┬───────┘       │     │         │
              │               │     │         │
              ▼               ▼     ▼         ▼
            HOME         DASHBOARD ADMIN    ADMIN
            PAGE           (/      PANEL     PANEL
            (/)          dashboard) (/      (/
                                   admin)    admin)
```

---

## 🔐 **What The API Does (Backend)**

### **POST /api/v1/auth/register**
```json
Request:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Pass123!",
  "role": "store_admin",
  "storeName": "Fresh Market",
  "storeSlug": "fresh-market"
}

Response:
{
  "id": "uuid-123",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "store_admin",
  "tenantId": "tenant-uuid"
}
```

**What happens:**
- ✅ Creates new Tenant (store) if `role === "store_admin"`
- ✅ Creates User with specified role
- ✅ Links user to tenant
- ✅ Returns user object with role

### **POST /api/v1/auth/login**
```json
Request:
{
  "email": "john@example.com",
  "password": "Pass123!"
}

Response:
{
  "id": "uuid-123",
  "email": "john@example.com",
  "role": "store_admin",
  "firstName": "John",
  "lastName": "Doe"
}
```

**What happens:**
- ✅ Finds user by email
- ✅ Verifies password
- ✅ Returns user with role
- ✅ Frontend uses role to redirect

---

## 💾 **LocalStorage Data Structure**

After login, user data is stored in browser's localStorage:

```javascript
localStorage.user = {
  "id": "uuid-123",
  "email": "owner@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "store_admin",
  "tenantId": "tenant-uuid"
}
```

---

## 🔑 **Role-Based Redirects**

| Role | After Login | Redirects To | Can Access |
|------|-----------|-------------|-----------|
| `customer` | Home page | `/` | Store pages, cart, checkout |
| `store_admin` | Dashboard | `/dashboard` | Dashboard, manage products/orders |
| `super_admin` | Admin panel | `/admin` | Admin panel, manage tenants |

---

## ✅ **What Was Fixed**

### **Before (Broken)**
- ❌ Store owner signup didn't create a tenant
- ❌ API always set role as "customer"
- ❌ Frontend didn't send role to API
- ❌ Store owner redirected to home page instead of dashboard

### **After (Fixed)**
- ✅ Store owner signup creates tenant automatically
- ✅ API respects role sent from frontend
- ✅ Frontend sends full signup data including role
- ✅ Store owner correctly redirected to `/dashboard`
- ✅ Admin redirected to `/admin`
- ✅ Customer redirected to `/`

---

## 🧪 **Test the Complete Flow**

### **Test 1: Customer Sign Up → Login → Shop**
```
1. Visit http://localhost:3000/auth/signup
2. Choose "Customer"
3. Fill in details: John Doe, john@test.local, pass123
4. Click Create Account
5. Should go to Login page
6. Login with john@test.local / pass123
7. Should see HOME PAGE with stores ✅
```

### **Test 2: Store Owner Sign Up → Dashboard → Manage Store**
```
1. Visit http://localhost:3000/auth/signup
2. Choose "Store Owner"
3. Fill in:
   - Name: John Doe
   - Email: john@store.local
   - Store Name: John's Market
   - Store URL: johns-market
   - Password: pass123
4. Click Create Account
5. Should go directly to DASHBOARD ✅
6. Should see products, categories, orders tabs ✅
```

### **Test 3: Demo Store Owner Login**
```
1. Visit http://localhost:3000/auth/login
2. Enter: owner@democore.local / StoreAdmin123!
3. Should go directly to DASHBOARD ✅
4. Should see Demo Grocery Store management ✅
```

### **Test 4: Demo Admin Login**
```
1. Visit http://localhost:3000/auth/login
2. Enter: admin@grocio.local / SuperAdmin123!
3. Should go directly to ADMIN PANEL ✅
4. Should see all tenants, users, analytics ✅
```

---

## 🎯 **Summary**

**The complete authentication flow is now working correctly:**

1. ✅ Sign up as customer → Goes to login → Home page
2. ✅ Sign up as store owner → Creates tenant → Dashboard
3. ✅ Login → Correct role-based redirect
4. ✅ Store owner dashboard → Manage everything
5. ✅ Admin panel → Manage all stores

**Try it now!** 🚀
