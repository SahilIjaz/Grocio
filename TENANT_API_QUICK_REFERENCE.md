# Tenant API Quick Reference

## Base URL
```
http://localhost:3001/api/v1/tenants
```

## Authentication
- All endpoints except `POST /tenants` and `GET /:slug/check-slug` require Bearer token
- Include header: `Authorization: Bearer <access_token>`

---

## Endpoints

### 1. Register Tenant (Public)
```
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "Demo Grocery Store",
  "slug": "demo-grocery",
  "contactEmail": "contact@store.com",
  "contactPhone": "+1-234-567-8900",
  "address": "123 Main St",
  "ownerFirstName": "John",
  "ownerLastName": "Doe",
  "ownerEmail": "owner@store.com",
  "ownerPassword": "SecurePass123!",
  "ownerPasswordConfirm": "SecurePass123!",
  "settings": {
    "currency": "USD",
    "timezone": "America/Los_Angeles",
    "taxRate": 0.08,
    "deliveryFee": 5.0,
    "orderPrefix": "ORD"
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "tenant": {
      "id": "...",
      "name": "Demo Grocery Store",
      "slug": "demo-grocery",
      "status": "active",
      "contactEmail": "contact@store.com",
      "settings": {...}
    },
    "storeAdmin": {
      "id": "...",
      "email": "owner@store.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "store_admin"
    }
  }
}
```

### 2. Get Tenant
```
GET /api/v1/tenants/{id}
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Demo Grocery Store",
    "slug": "demo-grocery",
    "status": "active",
    "logoUrl": "...",
    "contactEmail": "contact@store.com",
    "contactPhone": "+1-234-567-8900",
    "address": "123 Main St",
    "settings": {...},
    "createdAt": "2026-04-12T...",
    "updatedAt": "2026-04-12T..."
  }
}
```

### 3. Update Tenant
```
PATCH /api/v1/tenants/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Store Name",
  "contactEmail": "newemail@store.com",
  "settings": {
    "currency": "EUR",
    "timezone": "Europe/London"
  }
}

Response: 200 OK
{
  "success": true,
  "data": { ...updated tenant }
}
```

### 4. Suspend Tenant (Super Admin Only)
```
POST /api/v1/tenants/{id}/suspend
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "reason": "Non-payment of subscription fee"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "status": "suspended",
    "message": "Tenant suspended successfully"
  }
}
```

### 5. Activate Tenant (Super Admin Only)
```
POST /api/v1/tenants/{id}/activate
Authorization: Bearer <super_admin_token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "status": "active",
    "message": "Tenant activated successfully"
  }
}
```

### 6. List All Tenants (Super Admin Only)
```
GET /api/v1/tenants?page=1&limit=20&status=active&search=grocery
Authorization: Bearer <super_admin_token>

Query Parameters:
- page: integer (default: 1, min: 1)
- limit: integer (default: 20, min: 1, max: 100)
- status: "active" | "suspended" | "pending" (optional)
- search: string (searches name, slug, contactEmail)

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Demo Grocery Store",
      "slug": "demo-grocery",
      "status": "active",
      "contactEmail": "contact@store.com",
      "createdAt": "2026-04-12T..."
    },
    ...
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

### 7. Delete Tenant (Super Admin Only)
```
DELETE /api/v1/tenants/{id}
Authorization: Bearer <super_admin_token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "message": "Tenant deleted successfully"
  }
}
```

### 8. Check Slug Availability (Public)
```
GET /api/v1/tenants/{slug}/check-slug

Response: 200 OK
{
  "success": true,
  "data": {
    "slug": "demo-grocery",
    "available": true  # or false if taken
  }
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "name": "Store name must be at least 2 characters",
      "ownerPassword": "Password must contain at least one digit"
    }
  }
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Tenant slug already exists"
  }
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Tenant not found"
  }
}
```

### Forbidden Error (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### Unauthorized Error (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

## Authorization Rules

| Endpoint | Method | Public | Store Admin | Super Admin |
|----------|--------|--------|-------------|------------|
| `/tenants` | POST | ✅ | ❌ | ❌ |
| `/tenants` | GET | ❌ | ❌ | ✅ |
| `/tenants/{id}` | GET | ❌ | ✅ (own) | ✅ (any) |
| `/tenants/{id}` | PATCH | ❌ | ✅ (own) | ✅ (any) |
| `/tenants/{id}/suspend` | POST | ❌ | ❌ | ✅ |
| `/tenants/{id}/activate` | POST | ❌ | ❌ | ✅ |
| `/tenants/{id}` | DELETE | ❌ | ❌ | ✅ |
| `/tenants/{slug}/check-slug` | GET | ✅ | ✅ | ✅ |

---

## Example cURL Commands

### Register Tenant
```bash
curl -X POST http://localhost:3001/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Store",
    "slug": "my-store",
    "contactEmail": "contact@mystore.com",
    "ownerFirstName": "John",
    "ownerLastName": "Doe",
    "ownerEmail": "owner@mystore.com",
    "ownerPassword": "SecurePass123!",
    "ownerPasswordConfirm": "SecurePass123!"
  }'
```

### Get Tenant
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/tenants/{id}
```

### Update Tenant
```bash
curl -X PATCH http://localhost:3001/api/v1/tenants/{id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Store Name"
  }'
```

### List Tenants
```bash
curl "http://localhost:3001/api/v1/tenants?page=1&limit=20&status=active" \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"
```

### Check Slug
```bash
curl http://localhost:3001/api/v1/tenants/my-store/check-slug
```

---

## Validation Rules

### Store Name
- Min: 2 characters
- Max: 120 characters
- Auto-trimmed

### Store Slug
- Min: 2 characters
- Max: 60 characters
- Only lowercase letters, numbers, hyphens
- Must be unique

### Email
- Must be valid format
- Auto-lowercase, auto-trimmed
- Must be unique (contactEmail or ownerEmail)

### Phone
- Min: 10 digits
- Max: 20 characters
- Optional

### Address
- Max: 255 characters
- Optional

### Owner Name
- Min: 1 character
- Max: 80 characters

### Owner Password
- Min: 8 characters
- Must have: 1 uppercase, 1 lowercase, 1 digit, 1 special char
- Must match ownerPasswordConfirm

---

## Status Values

```
active     → Tenant operational (default)
suspended  → Tenant suspended (cannot place orders)
pending    → Tenant in registration (rare, reserved for future use)
```

---

## Settings Object

```json
{
  "currency": "USD",           // 3-letter currency code
  "timezone": "America/Los_Angeles",  // IANA timezone
  "taxRate": 0.08,             // Decimal 0-1 (8%)
  "deliveryFee": 5.0,          // Non-negative number
  "orderPrefix": "ORD"         // Max 10 chars (ORD-00001)
}
```

---

## Rate Limits

- Global: 200 requests/min per IP
- Login: 10 attempts/15 min per IP
- After exceeding limit: HTTP 429 Too Many Requests

---

## Testing

Run integration tests:
```bash
cd apps/api
npm test -- tenants.test.ts
```

All 44 tests should pass ✅

---

*Generated: 2026-04-12*
*Last Updated: Phase 2 Complete*
