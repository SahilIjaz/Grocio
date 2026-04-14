# Grocio - Multi-Tenant Grocery Platform
## Complete User Flow & Application Architecture

---

## 🎯 User Flows

### 1. **CUSTOMER FLOW**
```
Home Page (/) 
  ↓
Browse Stores
  ↓
Sign Up or Login (/auth/signup or /auth/login)
  ↓
Browse Products (/store/[slug])
  ↓
Add to Cart
  ↓
Checkout (/cart)
  ↓
Place Order
  ↓
Order Confirmation
```

**Customer Actions:**
- View available stores on homepage
- Create account or login
- Browse products by category
- Add items to cart with quantity controls
- Checkout with delivery address
- Order confirmation & success page

---

### 2. **STORE OWNER FLOW**
```
Sign Up as Store Owner (/auth/signup)
  ↓
Create Store (provides store slug)
  ↓
Login (/auth/login)
  ↓
Dashboard (/dashboard)
  ↓
Manage Store:
  ├─ Add/Edit/Delete Products
  ├─ Create/Manage Categories
  ├─ Monitor Inventory
  ├─ View Customer Orders
  └─ Store Settings
```

**Store Admin Features:**
- **Overview**: View key metrics (products, orders, revenue, categories)
- **Products Management**: 
  - Create new products
  - Edit existing products
  - Delete products
  - Manage pricing & stock
- **Categories Management**:
  - Create product categories
  - Organize product listings
  - Edit/delete categories
- **Orders**: View customer orders from store
- **Inventory**: Track stock levels & low stock alerts
- **Settings**: Update store information

---

### 3. **SUPER ADMIN FLOW**
```
Login as Super Admin (/auth/login)
  ↓
Admin Panel (/admin)
  ↓
Manage System:
  ├─ Manage All Tenants (Stores)
  ├─ View System Users
  ├─ Analytics & Reports
  ├─ System-wide Settings
  └─ View Overall Sales/Orders
```

**Super Admin Features:**
- **Dashboard**: System overview and key metrics
- **Tenants Management**:
  - View all store tenants
  - Create new tenants
  - View tenant status (active/inactive)
  - Edit tenant information
- **Users Management**:
  - View all system users
  - Manage user roles
  - View user activity
- **Analytics**: System-wide analytics (coming soon)
- **System Settings**: Platform configuration

---

## 🔑 Key Roles & Permissions

### **Super Administrator (super_admin)**
- Access: `/admin` dashboard
- Permissions:
  - Manage all tenants
  - Manage all users
  - View system analytics
  - Configure system settings
  - View all orders across platform
- Demo Account:
  - Email: `admin@grocio.local`
  - Password: `SuperAdmin123!`

### **Store Administrator (store_admin)**
- Access: `/dashboard` and `/store/[slug]`
- Permissions:
  - Manage own store's products
  - Create/manage categories
  - View own orders
  - Manage inventory
  - Update store settings
  - Cannot access other stores or admin panel
- Demo Account:
  - Email: `owner@democore.local`
  - Password: `StoreAdmin123!`

### **Customer (customer)**
- Access: Home page `/`, store pages `/store/[slug]`, cart `/cart`
- Permissions:
  - Browse all stores
  - View products
  - Add to cart
  - Place orders
  - Cannot access dashboard or admin
- Demo Account:
  - Email: `customer@example.local`
  - Password: `Customer123!`

---

## 📍 URL Routes & Pages

### **Public Pages**
| Route | Purpose |
|-------|---------|
| `/` | Home page with store listings |
| `/store/[slug]` | Browse products for specific store |
| `/cart` | Shopping cart & checkout |

### **Authentication**
| Route | Purpose |
|-------|---------|
| `/auth/login` | User login page |
| `/auth/signup` | User registration (customer/store owner) |

### **Store Owner Dashboard**
| Route | Purpose |
|-------|---------|
| `/dashboard` | Dashboard overview |
| `/dashboard?tab=products` | Manage products |
| `/dashboard?tab=categories` | Manage categories |
| `/dashboard?tab=orders` | View orders |
| `/dashboard?tab=inventory` | Inventory management |
| `/dashboard?tab=settings` | Store settings |

### **Admin Panel**
| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard |
| `/admin?tab=tenants` | Manage tenants |
| `/admin?tab=users` | Manage users |
| `/admin?tab=analytics` | System analytics |
| `/admin?tab=settings` | System settings |

---

## 🔐 Authentication & Security

### **Login Flow**
1. User visits `/auth/login`
2. Enters email & password
3. API validates credentials
4. Returns user object with role
5. Stored in `localStorage` as `user` JSON
6. Redirect based on role:
   - `super_admin` → `/admin`
   - `store_admin` → `/dashboard`
   - `customer` → `/`

### **Role-Based Access Control (RBAC)**
- Each dashboard page checks `localStorage.user.role`
- Redirects to login if not authenticated
- Redirects to appropriate page based on role
- Prevents unauthorized access

### **Demo Credentials**
```
ADMIN ACCOUNT
Email: admin@grocio.local
Password: SuperAdmin123!

STORE OWNER ACCOUNT
Email: owner@democore.local
Password: StoreAdmin123!

CUSTOMER ACCOUNT
Email: customer@example.local
Password: Customer123!
```

---

## 📊 Database Models

### **Tenant (Store)**
- `id`: UUID
- `name`: Store name
- `slug`: URL slug
- `status`: active/inactive
- `logoUrl`: Store logo
- `contactEmail`: Store email
- `contactPhone`: Store phone
- `address`: Physical address
- `settings`: JSON (tax rate, currency, timezone, etc.)

### **User**
- `id`: UUID
- `email`: Email address
- `passwordHash`: Hashed password
- `firstName`: First name
- `lastName`: Last name
- `role`: super_admin, store_admin, or customer
- `tenantId`: FK to Tenant (for store admins)

### **Product**
- `id`: UUID
- `tenantId`: FK to Tenant
- `categoryId`: FK to Category
- `name`: Product name
- `price`: Product price
- `stockQuantity`: Available quantity
- `description`: Product details
- `sku`: Stock keeping unit

### **Category**
- `id`: UUID
- `tenantId`: FK to Tenant
- `name`: Category name
- `slug`: URL slug
- `description`: Category details

### **Cart**
- `id`: UUID
- `userId`: FK to User
- `tenantId`: FK to Tenant

### **CartItem**
- `cartId`: FK to Cart
- `productId`: FK to Product
- `quantity`: Item quantity
- `unitPrice`: Price at time of adding

### **Order**
- `id`: UUID
- `userId`: FK to User
- `tenantId`: FK to Tenant
- `orderNumber`: Unique order ID
- `subtotal`: Order subtotal
- `totalAmount`: Final total
- `deliveryAddress`: Delivery location
- `status`: pending, confirmed, shipped, delivered

---

## 🎨 UI Components & Features

### **Professional Design System**
- Modern gradient backgrounds
- Card-based layouts
- Color-coded badges & alerts
- Smooth animations & transitions
- Responsive grid layouts
- Custom scrollbars
- Professional shadows & depth

### **Navigation**
- Sticky header on all pages
- Sidebar navigation for dashboards
- Role-based menu items
- Quick action buttons
- Cart badge with item count

### **Forms**
- Clean input styling
- Form validation
- Error messaging
- Demo account quick-fill buttons
- Password confirmation

### **Tables**
- Sortable data tables
- Action buttons (Edit, Delete, View)
- Status badges
- Responsive design

### **Cards**
- Hover animations
- Shadow effects
- Icon-based indicators
- Product showcase
- Statistics display

---

## 🚀 How to Test

### **Test Customer Flow:**
1. Go to `http://localhost:3000`
2. Click "Sign Up" → Select "Customer"
3. Fill in details and create account
4. Login with credentials
5. Browse products
6. Add items to cart
7. Checkout

### **Test Store Owner Flow:**
1. Login with store owner account:
   - Email: `owner@democore.local`
   - Password: `StoreAdmin123!`
2. Access dashboard at `/dashboard`
3. Manage products, categories, and orders

### **Test Admin Flow:**
1. Login with admin account:
   - Email: `admin@grocio.local`
   - Password: `SuperAdmin123!`
2. Access admin panel at `/admin`
3. Manage tenants and users

---

## 📱 Responsive Design
- Mobile-first approach
- Breakpoints for tablet & desktop
- Touch-friendly buttons
- Responsive grids
- Mobile-optimized navigation

---

## ⚡ Performance Features
- Optimized CSS with design system
- Fast page transitions
- Smooth animations
- Efficient state management
- Client-side filtering & search

---

## 🔄 Next Steps for Production
- [ ] Implement JWT token handling
- [ ] Add password reset flow
- [ ] Email verification
- [ ] Payment gateway integration
- [ ] Order tracking
- [ ] Product image uploads
- [ ] Advanced analytics
- [ ] Notification system
- [ ] Review & rating system
- [ ] Inventory alerts
