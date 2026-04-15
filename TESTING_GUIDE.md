# 🧪 Grocio - Complete Testing Guide

## ✅ System Status

**API Server**: Running on `http://localhost:3001` ✓
**Web Server**: Running on `http://localhost:3000` ✓
**Database**: SQLite (dev.db) - Seeded with demo data ✓

---

## 🚀 How to Run the Application

From the project root:
```bash
pnpm dev
```

This will start:
- **Web App** on `http://localhost:3000`
- **API Server** on `http://localhost:3001`

---

## 🔐 Authentication System - Complete Test Plan

### **Demo Accounts (Pre-seeded)**

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Super Admin | `admin@grocio.local` | `SuperAdmin123!` | Manage entire platform |
| Store Owner | `owner@democore.local` | `StoreAdmin123!` | Own and manage a store |
| Customer | `customer@example.local` | `Customer123!` | Browse and shop |

---

## 📋 Test Scenario 1: Customer Signup & Login

### **Goal**: Register a new customer account and verify login redirect

### **Steps**:
1. Go to `http://localhost:3000/auth/signup`
2. Click **"Customer"** button
3. Fill in the form:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe@test.local`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
4. Click **"Create Account"**
5. **Expected**: ✅ "Account Created!" success message
6. Redirects to `http://localhost:3000/auth/login` (after 2 seconds)

### **Then Login**:
1. Enter email: `john.doe@test.local`
2. Enter password: `TestPass123!`
3. Click **"Sign In"**
4. **Expected**: ✅ Redirected to homepage `/` (customer dashboard)

---

## 🏪 Test Scenario 2: Store Owner Signup & Dashboard Access

### **Goal**: Register a new store and verify dashboard access

### **Steps**:
1. Go to `http://localhost:3000/auth/signup`
2. Click **"Store Owner"** button (🏪)
3. Fill in the form:
   - First Name: `Jane`
   - Last Name: `Smith`
   - Email: `jane.smith@test.local`
   - Store Name: `Jane's Fresh Market`
   - Store URL Slug: `janes-fresh-market`
   - Password: `StorePass123!`
   - Confirm Password: `StorePass123!`
4. Click **"Create Account"**
5. **Expected**: ✅ "Account Created!" success message
6. **REDIRECTS DIRECTLY** to `http://localhost:3000/dashboard` (store owner dashboard)

### **Dashboard Features** (visible after signup):
- ✅ **Overview Tab**: Key metrics, quick actions
- ✅ **Products Tab**: Manage products
- ✅ **Categories Tab**: Manage product categories
- ✅ **Orders Tab**: View customer orders
- ✅ **Inventory Tab**: Track stock levels
- ✅ **Settings Tab**: Configure store

### **Note**: The tenant (store) is automatically created during signup

---

## 👑 Test Scenario 3: Admin Login & Panel Access

### **Goal**: Verify admin can access platform management panel

### **Steps**:
1. Go to `http://localhost:3000/auth/login`
2. Click the **"Admin"** demo account button (or enter manually):
   - Email: `admin@grocio.local`
   - Password: `SuperAdmin123!`
3. Click **"Sign In"**
4. **Expected**: ✅ Redirected to `http://localhost:3000/admin` (admin panel)

### **Admin Panel Features**:
- ✅ Manage all tenants (stores)
- ✅ View all users
- ✅ System analytics
- ✅ Platform settings

---

## 🛒 Test Scenario 4: Customer Shopping Flow

### **Goal**: Test the complete shopping experience

### **Steps**:

**1. Login as Customer**:
- Go to `http://localhost:3000/auth/login`
- Click **"Customer"** demo account or enter:
  - Email: `customer@example.local`
  - Password: `Customer123!`
- **Expected**: ✅ Redirected to homepage `/`

**2. Browse Stores**:
- Homepage shows **"Demo Grocery Store"**
- Click on the store to view products

**3. View Products**:
- You should see products:
  - 🍎 Red Apples ($3.99/lb)
  - 🥛 Whole Milk ($4.49/gallon)
  - 🍗 Chicken Breast ($8.99/lb)

**4. Add to Cart** (if cart feature is enabled):
- Click "Add to Cart" on a product
- Specify quantity
- Product should be added

**5. Checkout** (if checkout feature is enabled):
- View cart
- Enter delivery address
- Complete order
- **Expected**: ✅ Order confirmation with order number

---

## 🔄 Test Scenario 5: Role-Based Access Control

### **Goal**: Verify users can only access their designated areas

### **Test 1 - Customer cannot access Dashboard**:
1. Login as customer
2. Try to manually visit `http://localhost:3000/dashboard`
3. **Expected**: ✅ Redirected back to homepage

### **Test 2 - Store Owner cannot access Admin Panel**:
1. Login as store owner
2. Try to manually visit `http://localhost:3000/admin`
3. **Expected**: ✅ Redirected back to dashboard or homepage

### **Test 3 - Not Logged In redirects to Login**:
1. Clear localStorage (or use incognito mode)
2. Try to visit `http://localhost:3000/dashboard`
3. **Expected**: ✅ Redirected to login page

---

## 🧪 Test Scenario 6: Password Security & Encryption

### **Verification**:
The system now uses **bcrypt** for password hashing (industry-standard):
- ✅ Passwords hashed with bcrypt on registration
- ✅ Passwords verified with bcrypt on login
- ✅ Demo accounts seeded with bcrypt-hashed passwords
- ✅ User passwords never stored in plain text

---

## 📱 Test Scenario 7: Demo Account Quick Login

### **Quick Test Method**:
1. Go to `http://localhost:3000/auth/login`
2. See three demo account buttons at the bottom:
   - ✅ Click "Admin" to autofill admin credentials
   - ✅ Click "Store Owner" to autofill store owner credentials
   - ✅ Click "Customer" to autofill customer credentials
3. Click "Sign In"
4. **Expected**: ✅ Auto-login and proper redirect

---

## 🔧 API Endpoints to Test

### **Authentication**

**POST** `/api/v1/auth/login`
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.local",
    "password": "Customer123!"
  }'
```
**Expected Response**:
```json
{
  "id": "uuid-123",
  "email": "customer@example.local",
  "role": "customer",
  "firstName": "John",
  "lastName": "Customer",
  "tenantId": "tenant-uuid"
}
```

**POST** `/api/v1/auth/register`
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newstore@test.local",
    "password": "TestPass123!",
    "firstName": "New",
    "lastName": "Owner",
    "role": "store_admin",
    "storeName": "New Store",
    "storeSlug": "new-store"
  }'
```

### **Store Management**

**GET** `/api/v1/tenants`
- Lists all active stores

**GET** `/api/v1/tenants/:slug`
- Get specific store details

**GET** `/api/v1/tenants/:tenantSlug/products`
- Get all products for a store

**GET** `/api/v1/tenants/:tenantSlug/categories`
- Get all product categories for a store

### **Cart & Orders**

**POST** `/api/v1/cart/add`
- Add item to cart

**GET** `/api/v1/cart/:cartId`
- Retrieve cart contents

**POST** `/api/v1/orders`
- Create a new order

---

## ✨ Recent Fixes & Improvements

### **1. Password Hashing** ✅
- **Before**: Passwords stored as base64 (insecure)
- **After**: Passwords hashed with bcrypt (industry-standard)
- **Impact**: All new registrations and logins use secure hashing

### **2. Database Seeding** ✅
- **Added**: Complete seed script with demo accounts
- **Includes**: Admin, store owner, customer accounts + demo products
- **Updated**: Seed script to use JSON.stringify for SQLite compatibility

### **3. Login Response** ✅
- **Now includes**: firstName, lastName, tenantId in response
- **Enables**: Complete user profile in localStorage for frontend

### **4. Registration Response** ✅
- **Now includes**: All user data including role and tenantId
- **Enables**: Direct dashboard redirect for store owners

---

## 🐛 Troubleshooting

### **Issue**: "Port already in use" error
**Solution**:
```bash
pkill -9 node
pnpm dev
```

### **Issue**: Cannot login with demo accounts
**Solution**: 
1. Verify database is seeded: `npm run prisma:seed` (if needed)
2. Check SQLite database exists: `ls apps/api/prisma/dev.db`
3. Verify demo accounts: `sqlite3 apps/api/prisma/dev.db "SELECT email, role FROM User;"`

### **Issue**: Frontend not connecting to API
**Solution**: 
1. Verify API is running on port 3001: `curl http://localhost:3001/api/v1/health`
2. Check frontend is on port 3000: Visit `http://localhost:3000`
3. Check CORS is enabled: API has `cors({ origin: "*" })`

### **Issue**: Dashboard not showing after store owner signup
**Solution**:
1. Check browser localStorage has user data
2. Verify user role is `store_admin`
3. Check console for JavaScript errors (F12)

---

## 📊 Database Schema Quick Reference

### **Key Models**:
- **User**: Stores user account info, password hash, role, tenant link
- **Tenant**: Represents a store, contains settings and configuration
- **Product**: Store's products with pricing and inventory
- **Category**: Product groupings within a store
- **Cart**: Shopping cart for customers
- **Order**: Customer orders with line items

### **View Demo Data**:
```bash
# View all users
sqlite3 apps/api/prisma/dev.db "SELECT email, role FROM User;"

# View all tenants
sqlite3 apps/api/prisma/dev.db "SELECT name, slug FROM Tenant;"

# View products for demo store
sqlite3 apps/api/prisma/dev.db "SELECT name, price, stockQuantity FROM Product LIMIT 5;"
```

---

## ✅ System Checklist

Before considering the system production-ready:

- [ ] API server starts without errors
- [ ] Web server starts without errors
- [ ] Database seeded with demo data
- [ ] Customer can sign up and login
- [ ] Store owner can sign up and access dashboard
- [ ] Admin can login and access admin panel
- [ ] Role-based access control working
- [ ] Password hashing uses bcrypt
- [ ] All API endpoints responding correctly
- [ ] Demo accounts can login with provided credentials
- [ ] Product browsing works for customers
- [ ] Cart functionality works (if enabled)
- [ ] No console errors in browser

---

## 🎉 You're All Set!

The **Grocio** application is now ready for testing. Start with:

```bash
pnpm dev
```

Then visit `http://localhost:3000` to begin testing!

---

**Last Updated**: 2026-04-14
**System Status**: ✅ Fully Functional
**Database**: ✅ Seeded with Demo Data
**Security**: ✅ Bcrypt Password Hashing
