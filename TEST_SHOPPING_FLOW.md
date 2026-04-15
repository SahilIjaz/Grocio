# 🧪 Quick Test Guide - Shopping Flow

## ⚡ Start Here

```bash
pnpm dev
```

Then open: http://localhost:3000

---

## 🎯 Test 1: Guest Shopping (No Account)

**Goal**: Add items to cart without logging in

### Steps:
1. **Homepage** - http://localhost:3000
   - See "Demo Grocery Store" and other stores
   - Click **"Shop Now"**

2. **Store Page** - http://localhost:3000/store/demo-grocery
   - See products: Apples, Milk, Chicken
   - See categories filter on left

3. **Add Items** (no login needed!)
   - Click **"Add"** on Red Apples
   - See button changes to **"+ 1 -"**
   - Click **"+"** to increase quantity to 2
   - Click **"Add"** on Whole Milk
   - See cart badge shows **"3"** items

4. **Cart Persists** (refresh test)
   - Press **F5** to refresh page
   - ✅ Cart still shows 2 Apples + 1 Milk
   - Cart saved in localStorage!

5. **Proceed to Checkout**
   - Click **"Proceed to Checkout"** button
   - Go to http://localhost:3000/cart?slug=demo-grocery

6. **Checkout Page**
   - See cart items and total
   - Click **"Sign In to Checkout"** button
   - ✅ **Authentication Modal appears**

---

## 🔐 Test 2: Signup at Checkout

**Goal**: Create new account during checkout

### Steps (continuing from Test 1):

1. **Modal - Signup Mode**
   - Modal shows: "Create Account"
   - See: Email, First Name, Last Name, Password fields

2. **Fill Signup Form**
   ```
   Email: testuser@example.local
   First Name: Test
   Last Name: User
   Password: TestPass123!
   ```

3. **Submit**
   - Click **"Create Account"** button
   - ✅ Account created
   - ✅ Modal closes
   - ✅ Form pre-fills with user data

4. **Complete Checkout**
   - Modal closed, showing checkout form
   - See: **"✅ Signed in as Test User"**
   - Form shows:
     - Email: testuser@example.local ✓
     - First Name: Test ✓
     - Last Name: User ✓
     - Delivery Address: (empty - user fills)

5. **Enter Delivery Address**
   - Click delivery address field
   - Enter: `123 Oak Street, San Francisco, CA 94102`

6. **Place Order**
   - Order Summary shows:
     - Subtotal: $8.47 (2 apples + 1 milk)
     - Tax: $0.68
     - Shipping: $5.00
     - **Total: $14.15**
   - Click **"Complete Order"** button

7. **Success!**
   - ✅ See: **"Order Placed Successfully!"**
   - See: "Thank you for your order..."
   - Auto-redirects to homepage

---

## 👤 Test 3: Existing Customer - Quick Checkout

**Goal**: Returning customer checkout is instant

### Steps:

1. **Login First**
   - Go to http://localhost:3000/auth/login
   - Click **"Customer"** demo button
   - Auto-fills: customer@example.local / Customer123!
   - Click **"Sign In"**
   - Redirected to homepage

2. **Browse Store**
   - Click **"Shop Now"** on Demo Grocery Store
   - Add Red Apples (qty 1)
   - Add Whole Milk (qty 1)
   - Click **"Proceed to Checkout"**

3. **Instant Checkout**
   - Go to cart page
   - ✅ See: **"✅ Signed in as John Customer"**
   - Form already shows:
     - Email: customer@example.local
     - First Name: John
     - Last Name: Customer
   - Just enter delivery address!

4. **Quick Finish**
   - Delivery Address: `456 Main Ave, SF, CA 94103`
   - Click **"Complete Order"**
   - ✅ Success!

---

## 🏪 Test 4: Create New Store (appears instantly)

**Goal**: New store created → appears on homepage

### Steps:

1. **Signup as Store Owner**
   - Go to http://localhost:3000/auth/signup
   - Click **"Store Owner"** button (🏪)

2. **Fill Store Details**
   ```
   First Name: Sarah
   Last Name: Smith
   Email: sarah@mymarket.local
   Store Name: Sarah's Fresh Market
   Store Slug: sarahs-fresh-market
   Password: StorePass123!
   ```

3. **Create Account**
   - Click **"Create Account"**
   - ✅ Redirected to dashboard (no login needed)
   - See store management dashboard

4. **Check Homepage**
   - Go to http://localhost:3000
   - Scroll to "Available Stores"
   - ✅ See **"Sarah's Fresh Market"** in list!
   - Can click "Shop Now" (no products yet, but API ready)

---

## 🔄 Test 5: Login → Signup Mode Switch

**Goal**: Modal allows switching between login and signup

### Steps:

1. **Start Checkout**
   - Add items to cart
   - Click "Proceed to Checkout"
   - Click "Sign In to Checkout"
   - ✅ Modal shows in Login mode

2. **Switch to Signup**
   - See "Don't have an account?" at bottom
   - Click **"Sign Up Instead"** button
   - ✅ Modal switches to Signup form
   - Fields change to show: Email, First Name, Last Name, Password

3. **Switch Back to Login**
   - See "Already have an account?" at bottom
   - Click **"Sign In Instead"** button
   - ✅ Modal switches back to Login form

4. **Error Handling**
   - Try to login with wrong password
   - See **"⚠️ Invalid email or password"** error
   - Try to signup with existing email
   - See error message

---

## 🛒 Test 6: Category Filter & Search

**Goal**: Browse products by category and search

### Steps:

1. **Go to Store**
   - http://localhost:3000/store/demo-grocery

2. **Filter by Category**
   - See sidebar: "🏷️ All Products"
   - See: "🥕 Produce", "🥛 Dairy", "🥩 Meat"
   - Click **"🥛 Dairy"**
   - ✅ Only "Whole Milk" shows (Dairy category)
   - Click **"🥕 Produce"**
   - ✅ Only "Red Apples" shows

3. **Search Products**
   - Click **"🏷️ All Products"** to reset
   - Search box top: "Search products..."
   - Type: `apple`
   - ✅ Only Red Apples shows
   - Clear search
   - ✅ All products back

---

## 💾 Test 7: Cart Persistence

**Goal**: Cart saved in localStorage survives page refresh/close

### Steps:

1. **Add Items & Note**
   - Add: 2 Apples, 1 Milk
   - Cart shows: 3 items, $8.47

2. **Refresh Page**
   - Press **F5** (refresh)
   - ✅ Items still in cart!
   - Same quantities

3. **Open DevTools** (F12)
   - Go to **Application** tab
   - Click **LocalStorage**
   - Look for `cart_demo-grocery`
   - See JSON with product IDs and quantities

4. **Change Store & Back**
   - Go to different store page (if available)
   - Come back to demo-grocery
   - ✅ Cart still there!

---

## 📊 Quick Reference - All Flows

### Flow 1: Guest → Signup → Order
```
Home → Shop → Add Items → Checkout → Signup → Order ✅
```

### Flow 2: Returning Customer → Order
```
Home → Login → Shop → Checkout (auto-filled) → Order ✅
```

### Flow 3: Store Owner → Dashboard
```
Signup (Store Owner) → Dashboard Appears ✅
→ New Store on Home ✅
```

### Flow 4: Browse All Stores
```
Home (see all stores) → Shop (any store) ✅
```

---

## ✅ Success Criteria

You'll know it's working when:

- [ ] Can add items without login
- [ ] Cart persists after refresh
- [ ] Can checkout and signup
- [ ] Form pre-fills for returning customers
- [ ] New stores appear on homepage
- [ ] Can filter by category
- [ ] Can search products
- [ ] Orders place successfully
- [ ] Modal switches between login/signup
- [ ] Error messages show for invalid input

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Stores not loading | Refresh page, check API: http://localhost:3001/api/v1/tenants |
| Cart empty after refresh | Check localStorage (F12 → Application → LocalStorage) |
| Modal won't show | Try refresh, check browser console (F12) |
| Signup fails | Ensure password is filled, check API response |
| Can't add items | Try refresh store page |

---

## 🎓 Learning Path

1. **Start Simple** - Test guest shopping first
2. **Try Signup** - Create account at checkout
3. **Test Return Visit** - Login and checkout again
4. **Explore Store Creation** - Signup as store owner
5. **Check Backend** - Verify data in database

---

**Time to Complete**: ~15-20 minutes  
**Difficulty**: Easy  
**Prerequisites**: None - Just click buttons!
