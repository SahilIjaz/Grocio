# Grocio - Quick Start Guide

## 🚀 Getting Started

### **Servers Status**
- **API Server**: http://localhost:3001
- **Web App**: http://localhost:3000
- **Database**: Connected (Neon PostgreSQL)

Both servers are running. Open http://localhost:3000 in your browser.

---

## 🎬 First Steps

### **Option 1: Start Shopping (Customer)**
1. Go to http://localhost:3000
2. Click **"Sign Up"** button
3. Select **"Customer"**
4. Fill in details and create account
5. Login with your new account
6. Browse stores and products
7. Add items to cart
8. Proceed to checkout

OR use demo account:
- Email: `customer@example.local`
- Password: `Customer123!`

---

### **Option 2: Manage a Store (Store Owner)**
1. Go to http://localhost:3000/auth/login
2. Enter store owner credentials:
   - Email: `owner@democore.local`
   - Password: `StoreAdmin123!`
3. Click **"Sign In"**
4. You'll be redirected to `/dashboard`
5. Manage your store:
   - View overview stats
   - Add/Edit/Delete products
   - Manage categories
   - View orders
   - Check inventory

---

### **Option 3: Manage System (Super Admin)**
1. Go to http://localhost:3000/auth/login
2. Enter admin credentials:
   - Email: `admin@grocio.local`
   - Password: `SuperAdmin123!`
3. Click **"Sign In"**
4. You'll be redirected to `/admin`
5. Manage the entire platform:
   - View all tenants (stores)
   - Manage users
   - View system analytics
   - Configure system settings

---

## 📋 Complete User Journeys

### **Customer Journey**
```
Home → Browse Stores → Select Store → View Products 
→ Filter by Category → Add to Cart → Checkout 
→ Enter Delivery Details → Place Order → Confirmation
```

### **Store Owner Journey**
```
Login → Dashboard Overview → Manage Products 
→ Add New Product → Create Categories → View Orders 
→ Check Inventory → Update Settings
```

### **Admin Journey**
```
Login → Admin Dashboard → View Tenants → View Users 
→ Check Analytics → System Settings
```

---

## 🔑 Demo Accounts

### **Admin Account (Super Administrator)**
- **Role**: Manage entire platform
- **Email**: `admin@grocio.local`
- **Password**: `SuperAdmin123!`
- **Access**: `/admin` dashboard

### **Store Owner Account (Store Administrator)**
- **Role**: Manage store products & orders
- **Email**: `owner@democore.local`
- **Password**: `StoreAdmin123!`
- **Access**: `/dashboard`

### **Customer Account**
- **Role**: Browse & purchase products
- **Email**: `customer@example.local`
- **Password**: `Customer123!`
- **Access**: Home page & store pages

---

## 🗺️ Navigation Map

### **Public Pages**
- **Home** (`/`) - Browse stores & features
- **Store** (`/store/demo-grocery`) - View products
- **Cart** (`/cart`) - Checkout

### **Authentication**
- **Login** (`/auth/login`) - Sign in to account
- **Sign Up** (`/auth/signup`) - Create new account

### **Customer Area**
- Browse stores
- View products
- Add to cart
- Complete checkout
- View order confirmation

### **Store Owner Dashboard** (`/dashboard`)
- **Overview** - Sales & stats
- **Products** - Create/Edit products
- **Categories** - Manage categories
- **Orders** - View customer orders
- **Inventory** - Stock management
- **Settings** - Store configuration

### **Admin Panel** (`/admin`)
- **Dashboard** - System overview
- **Tenants** - Manage stores
- **Users** - Manage system users
- **Analytics** - Platform metrics
- **Settings** - System configuration

---

## ✨ Features Overview

### **For Customers**
✅ Browse multiple stores  
✅ View product categories  
✅ Search products  
✅ Add items to cart  
✅ Manage quantity  
✅ Secure checkout  
✅ Order confirmation  

### **For Store Owners**
✅ Dashboard overview  
✅ Add/Edit/Delete products  
✅ Create product categories  
✅ Manage inventory  
✅ View customer orders  
✅ Store settings  
✅ Sales metrics  

### **For Admins**
✅ View all stores  
✅ Create new tenants  
✅ Manage all users  
✅ System analytics  
✅ Platform settings  
✅ User management  
✅ System status monitoring  

---

## 🎨 Design Highlights

- **Professional Color Scheme**: Green (primary), Blue (secondary), Orange (accent)
- **Modern UI**: Gradient backgrounds, smooth animations, card layouts
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: Proper labels, focus states, color contrast
- **User Feedback**: Success messages, error alerts, loading states

---

## 🔒 Security Features

- **Role-Based Access Control**: Different dashboards for different roles
- **LocalStorage Authentication**: User data stored securely
- **Protected Routes**: Unauthorized users redirected to login
- **Input Validation**: Form validation on all inputs
- **Password Hashing**: Secure password handling (API side)

---

## 💾 Database Info

**Database**: Neon PostgreSQL  
**Tables**: Tenant, User, Product, Category, Cart, CartItem, Order, OrderItem  
**Sample Data**: Pre-seeded demo store with 3 products in 3 categories

---

## 🛠️ Development

### **Start Development Servers**
```bash
cd /Users/sahilijaz/Desktop/Grocio
pnpm dev
```

### **API Server**
```bash
# Runs on port 3001
# Check health: http://localhost:3001/api/v1/health
```

### **Web App**
```bash
# Runs on port 3000
# Built with Next.js 14.2.35 + React
```

---

## 📞 Support

### **Test the Flow**
1. Visit http://localhost:3000
2. Use demo accounts to explore
3. Test signup & login
4. Try different user roles

### **Report Issues**
- Check server logs for errors
- Verify API is running on port 3001
- Clear browser cache if needed
- Check localStorage for user data

---

## 🎓 Learning the Codebase

### **Frontend Structure** (`/apps/web`)
- `/app/page.tsx` - Home page
- `/app/auth/` - Login & signup pages
- `/app/store/[slug]/` - Store page
- `/app/cart/` - Cart & checkout
- `/app/dashboard/` - Store owner dashboard
- `/app/admin/` - Super admin panel
- `/app/styles.css` - Design system & components

### **Backend Structure** (`/apps/api`)
- `/src/server.ts` - Express API
- `/prisma/schema.prisma` - Database schema
- `/prisma/migrations/` - DB migrations
- `/prisma/seed.ts` - Sample data

---

## ✅ Verification Checklist

- [ ] API server running (http://localhost:3001/api/v1/health returns OK)
- [ ] Web app running (http://localhost:3000 loads)
- [ ] Can login with demo accounts
- [ ] Can browse products
- [ ] Can add to cart
- [ ] Can view dashboards
- [ ] Can view admin panel
- [ ] Professional UI is visible

---

## 🚀 Next Steps

After exploring the demo:
1. Create your own account
2. Try the complete customer flow
3. Login as store owner and manage products
4. Login as admin and view system
5. Test all features
6. Explore the codebase

---

**Happy exploring! 🎉**
