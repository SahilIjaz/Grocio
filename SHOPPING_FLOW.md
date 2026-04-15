# 🛍️ Grocio - Complete Shopping Flow

## Overview

The complete shopping experience is now implemented with:
- ✅ Guest shopping (no account required to browse & add to cart)
- ✅ Cart persistence (localStorage)
- ✅ Authentication modal at checkout
- ✅ Automatic store discovery (new stores appear on homepage)
- ✅ Category filtering and search

---

## 🏠 1. Homepage - Browse All Stores

**URL**: `http://localhost:3000`

### Features:
- ✅ Displays all active stores from the database
- ✅ New stores appear automatically when created
- ✅ Store cards show:
  - Store name
  - Address/description
  - "Open Now" status indicator
  - "Shop Now" button

### What Happens:
1. Homepage fetches stores from `/api/v1/tenants`
2. Stores with `status: "active"` are displayed
3. Each store card links to `/store/:slug`

### Example:
```
Demo Grocery Store
123 Main St, San Francisco, CA
[Open Now] [Shop Now →]

New Test Store
[Open Now] [Shop Now →]

Jane's Fresh Market
[Open Now] [Shop Now →]
```

---

## 🛒 2. Store Browsing - View Products

**URL**: `http://localhost:3000/store/demo-grocery`

### Features:
- ✅ Browse all products in the store
- ✅ Filter by category (Produce, Dairy, Meat, etc.)
- ✅ Search products by name
- ✅ Add items to cart **without login**
- ✅ Cart persists in localStorage (survives page refresh)

### What Happens:
1. User clicks "Shop Now" on a store
2. App fetches:
   - Products from `/api/v1/tenants/:slug/products`
   - Categories from `/api/v1/tenants/:slug/categories`
3. User can browse and add items
4. Cart is saved to localStorage as `cart_demo-grocery`

### Example Flow:
```
[🥕 Produce] [🥛 Dairy] [🥩 Meat]  ← Category Filters

┌─────────────────────────────────────────────────────────┐
│ 🥬 Red Apples - $3.99/lb                                │
│ Fresh, crisp red apples grown locally                    │
│                                      [Add] ← Click here  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🥛 Whole Milk - $4.49/gal                               │
│ Fresh whole milk, 1 gallon                              │
│                                      [+][1][-]          │
└─────────────────────────────────────────────────────────┘

Cart Summary (floating):
Items in Cart: 2
$8.48
[Proceed to Checkout →]
```

---

## 💳 3. Checkout - Authentication Required

**URL**: `http://localhost:3000/cart?slug=demo-grocery`

### Features:
- ✅ Guest users can browse and add to cart
- ✅ **At checkout, user must login or signup**
- ✅ Modal appears asking for authentication
- ✅ Switch between Login and Signup modes
- ✅ Pre-fills user data if already logged in

### What Happens:

#### If NOT Logged In:
1. User clicks "Sign In to Checkout" button
2. Authentication modal appears with two tabs:
   - **Login**: Email + Password
   - **Sign Up**: Email + First Name + Last Name + Password

3. User chooses one:
   - **Login**: Existing customers sign in
   - **Sign Up**: New customers create account

4. On success:
   - User data stored in localStorage
   - Modal closes
   - Form pre-filled with user details
   - User completes checkout

#### If Already Logged In:
1. Checkout form shows: "✅ Signed in as John Doe (john@example.com)"
2. Form is pre-filled with user's details
3. User only needs to enter/confirm delivery address
4. User clicks "Complete Order"

### Modal Example - Login:

```
┌─────────────────────────────────────┐
│            Sign In to Checkout  [✕]  │
│                                     │
│  Sign in to your account to        │
│  continue checkout                  │
│                                     │
│  Email Address                      │
│  [customer@example.com           ]  │
│                                     │
│  Password                           │
│  [••••••••                       ]  │
│                                     │
│  [      Sign In       ]             │
│                                     │
│  Don't have an account?             │
│  Sign Up Instead ← Click to switch  │
└─────────────────────────────────────┘
```

### Modal Example - Sign Up:

```
┌─────────────────────────────────────┐
│         Create Account  [✕]          │
│                                     │
│  Create a new account to            │
│  complete your purchase             │
│                                     │
│  Email Address                      │
│  [newuser@example.com            ]  │
│                                     │
│  [First Name] [Last Name]           │
│  [John     ] [Doe            ]      │
│                                     │
│  Password                           │
│  [Create a password             ]   │
│                                     │
│  [    Create Account    ]           │
│                                     │
│  Already have an account?           │
│  Sign In Instead ← Click to switch  │
└─────────────────────────────────────┘
```

---

## 📋 4. Complete Checkout

**After Authentication:**

```
Shopping Cart & Checkout

✅ Signed in as John Doe (john@example.com)

─────────────────────────────┬──────────────────
Cart Items                    │ Order Summary
                              │
🥬 Red Apples                 │ Subtotal  $8.48
Quantity: 2                   │ Tax (8%)  $0.68
Unit Price: $3.99            │ Shipping  $5.00
Subtotal: $7.98              │ ━━━━━━━━━━━━━━━
                              │ Total    $14.16
🥛 Whole Milk                 │
Quantity: 1                   │ Delivery Details
Unit Price: $4.49            │
Subtotal: $4.49              │ Email Address
                              │ [john@example.com]
                              │
                              │ First Name
                              │ [John            ]
                              │
                              │ Last Name
                              │ [Doe             ]
                              │
                              │ Delivery Address
                              │ [123 Main St...  ]
                              │
                              │ [  Complete Order  ]
                              │ [ Continue Shopping ]
```

---

## ✅ Order Confirmation

**After Order Placement:**

```
✅ Order Placed Successfully!

Thank you for your order. Your items will
be delivered soon. Redirecting to home...

[Back to Home]
```

---

## 🔄 Cart Persistence

### localStorage Keys:
- `user` - Logged-in user data
- `cart_demo-grocery` - Cart for Demo Grocery Store
- `cart_new-test-store` - Cart for New Test Store
- `cart_janes-fresh-market` - Cart for Jane's Market
- etc.

### Example localStorage cart:
```json
{
  "93408a65-99b0-46b5-b636-8c25cc92f3d0": 2,
  "3d4a5d77-fefc-46ec-b5b2-480c413c5a4b": 1
}
```

Cart persists when:
- ✅ User refreshes page
- ✅ User closes browser and comes back
- ✅ User navigates between stores

Cart is cleared:
- ✅ After successful order placement

---

## 🎯 Complete User Journey Examples

### Journey 1: Guest → Customer → Checkout

```
1. User visits http://localhost:3000
   ↓
2. Sees list of all stores
   ↓
3. Clicks "Shop Now" on Demo Grocery Store
   ↓
4. Browses products, adds 2 items to cart
   ✅ Cart saved in localStorage (no login needed yet)
   ↓
5. Clicks "Proceed to Checkout"
   ↓
6. Cart page loads
   ✅ Shows items & total
   ↓
7. Clicks "Sign In to Checkout"
   ↓
8. Authentication modal appears
   ↓
9. User doesn't have account → clicks "Sign Up Instead"
   ↓
10. Enters: Email, First Name, Last Name, Password
    ↓
11. Account created, user data saved to localStorage
    ↓
12. Modal closes, form auto-fills with user details
    ↓
13. User enters delivery address
    ↓
14. Clicks "Complete Order"
    ↓
15. ✅ Order placed successfully
    Cart cleared, redirects to home
```

### Journey 2: Returning Customer → Quick Checkout

```
1. User visits store page
   ✅ Browser has localStorage with user data
   ↓
2. User is already logged in
   ↓
3. Adds items to cart
   ↓
4. Clicks "Proceed to Checkout"
   ↓
5. Checkout page shows:
   ✅ "Signed in as John Doe"
   ✅ Form pre-filled with email, name
   ↓
6. User only enters delivery address
   ↓
7. Clicks "Complete Order"
   ↓
8. ✅ Order placed
```

### Journey 3: New Store Created → Appears on Homepage

```
1. Store owner signs up with:
   Email: jane@store.local
   Password: Pass123!
   Store Name: Jane's Fresh Market
   Store Slug: janes-fresh-market
   ↓
2. ✅ New store created in database
   ↓
3. Customer refreshes homepage
   ↓
4. ✅ Jane's Fresh Market appears in stores list
   ↓
5. Customer can click "Shop Now" immediately
   ↓
6. ✅ Can view products and checkout
```

---

## 🔒 Authentication at Checkout - Why?

Users can add items to cart without an account (better UX), but:
- ✅ We need user ID to create the order
- ✅ We need email to send order confirmation
- ✅ We need delivery address (customer enters at checkout)
- ✅ Users should verify they own the email address

---

## 🚀 Testing the Complete Flow

### Test 1: Guest Shopping + New Account
```
1. Go to http://localhost:3000
2. Click "Shop Now" on any store
3. Add 3-4 items to cart
4. Click "Proceed to Checkout"
5. Click "Sign In to Checkout"
6. Choose "Sign Up Instead"
7. Create new account with:
   Email: testuser@example.local
   First: Test
   Last: User
   Password: TestPass123!
8. Enter delivery address
9. Click "Complete Order"
10. ✅ Should see success message
```

### Test 2: Returning Customer Quick Checkout
```
1. Login first: Go to http://localhost:3000/auth/login
2. Use: customer@example.local / Customer123!
3. Go to store page
4. Add items to cart
5. Click "Proceed to Checkout"
6. ✅ Should already be logged in
7. Form shows user data
8. Just enter delivery address
9. Click "Complete Order"
10. ✅ Order placed
```

### Test 3: New Store Appears
```
1. Go to http://localhost:3000/auth/signup
2. Choose "Store Owner"
3. Create store:
   Email: owner@mystore.local
   Password: StorePass123!
   Store Name: My Test Store
   Store Slug: my-test-store
4. Go back to http://localhost:3000
5. ✅ "My Test Store" should appear in stores list
6. Click "Shop Now"
7. ✅ Can see store products (if you added products)
```

---

## 📊 Tech Implementation

### Frontend Features Added:
- ✅ Cart persistence via localStorage
- ✅ Authentication modal component
- ✅ Login/Signup mode switching
- ✅ User context loading from localStorage
- ✅ Form validation
- ✅ Error handling

### Files Updated:
- `apps/web/app/store/[slug]/page.tsx` - Cart persistence
- `apps/web/app/cart/page.tsx` - Authentication modal & flow

### API Endpoints Used:
- `GET /api/v1/tenants` - Fetch all stores
- `GET /api/v1/tenants/:slug/products` - Fetch products
- `GET /api/v1/tenants/:slug/categories` - Fetch categories
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/register` - Create new account
- `POST /api/v1/orders` - Place order

---

## ✨ Key Features

| Feature | Status | Details |
|---------|--------|---------|
| Browse stores | ✅ | All stores displayed on homepage |
| View products | ✅ | Category filter & search |
| Guest cart | ✅ | No login to add items |
| Cart persistence | ✅ | Saved in localStorage |
| New store auto-discovery | ✅ | Appears on homepage instantly |
| Checkout authentication | ✅ | Modal forces login/signup |
| Order placement | ✅ | Creates order with user details |
| User pre-fill | ✅ | Form auto-fills if logged in |

---

**Status**: ✅ **Complete & Tested**  
**Last Updated**: 2026-04-15
