# Environment Variables Complete Reference

This is the complete reference for all environment variables needed for production deployment.

---

## Quick Copy-Paste for Render

Copy these variable names and set their values in Render → Web Service → Settings → Environment:

```
NODE_ENV
PORT
API_PREFIX
DATABASE_URL
REDIS_URL
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
CLOUDINARY_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
CORS_ORIGINS
LOG_LEVEL
BCRYPT_ROUNDS
SESSION_SECRET
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX_REQUESTS
```

---

## Detailed Variable Reference

### Core Application

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `NODE_ENV` | ✅ | string | `production` | Controls app behavior: `development`, `test`, `production` |
| `PORT` | ✅ | number | `3001` | Port the Express server listens on. Render handles this automatically |
| `API_PREFIX` | ✅ | string | `/api/v1` | Prefix for all API routes |

---

### Database

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `DATABASE_URL` | ✅ | string | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string. Use Internal URL if on Render |
| `POSTGRES_DB` | ❌ | string | `grocio_db` | Database name (can be in DATABASE_URL) |
| `POSTGRES_USER` | ❌ | string | `grocio_user` | Database user (can be in DATABASE_URL) |
| `POSTGRES_PASSWORD` | ❌ | string | `password123` | Database password (can be in DATABASE_URL) |

**Get DATABASE_URL from:**
- Render PostgreSQL → Connections → Internal Database URL
- Neon → Connection String
- Format: `postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require`

---

### Redis Cache

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `REDIS_URL` | ✅ | string | `redis://:password@host:6379` | Complete Redis connection URL with password |
| `REDIS_HOST` | ❌ | string | `redis.example.com` | Redis host (alternative to REDIS_URL) |
| `REDIS_PORT` | ❌ | number | `6379` | Redis port (alternative to REDIS_URL) |
| `REDIS_PASSWORD` | ❌ | string | `password123` | Redis password (alternative to REDIS_URL) |

**Get REDIS_URL from:**
- Render Redis → Connections → Redis URL
- RedisLabs → Database URL
- Includes: `redis://:password@host:port`

---

### JWT Authentication

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `JWT_PRIVATE_KEY` | ✅ | string | `-----BEGIN PRIVATE KEY-----\n...` | RSA private key for signing tokens |
| `JWT_PUBLIC_KEY` | ✅ | string | `-----BEGIN PUBLIC KEY-----\n...` | RSA public key for verifying tokens |

**Generate with:**
```bash
# Private key (4096-bit)
openssl genrsa -out private.key 4096
cat private.key

# Public key
openssl rsa -in private.key -pubout -out public.key
cat public.key
```

**Include line breaks in environment variable:**
- When pasting to Render/GitHub, include `\n` or literal line breaks
- Most platforms handle this automatically

---

### Email Configuration (SMTP)

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `SMTP_HOST` | ✅ | string | `smtp.gmail.com` | Email server hostname |
| `SMTP_PORT` | ✅ | number | `587` | Email server port (usually 587 for TLS, 465 for SSL) |
| `SMTP_USER` | ✅ | string | `your_email@gmail.com` | Email address to send from |
| `SMTP_PASSWORD` | ✅ | string | `abcd efgh ijkl mnop` | App-specific password (not your regular password) |
| `SMTP_FROM` | ✅ | string | `noreply@grocio.com` | Display name for emails |

**For Gmail:**
1. Enable 2FA: https://myaccount.google.com/security
2. Generate app password: https://myaccount.google.com/apppasswords
3. Select Mail + Windows Computer
4. Copy the 16-character password to `SMTP_PASSWORD`

**For other providers:**
- Outlook/Office 365: `smtp.office365.com:587`
- SendGrid: `smtp.sendgrid.net:587` (use `apikey` as username)
- AWS SES: `email-smtp.region.amazonaws.com:587`

---

### CORS Configuration

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `CORS_ORIGINS` | ✅ | string | `https://grocio.vercel.app,https://www.grocio.com` | Comma-separated list of allowed origins |

**Set to:**
- Your Vercel frontend URL: `https://your-project.vercel.app`
- Custom domain: `https://www.grocio.com`
- Multiple origins: `https://grocio.vercel.app,https://www.grocio.com`

**Security note:** Set to specific domains, not `*` in production

---

### Cloudinary (Image Upload)

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `CLOUDINARY_NAME` | ✅ | string | `dn7e5xkpk` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | string | `781619335543278` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | string | `y2N1k0FnafDu-qlhnZDhWK6UVN4` | Your Cloudinary API secret |

**Get from:**
1. Log in to https://cloudinary.com
2. Dashboard → Settings → Account
3. Copy Cloud Name, API Key, API Secret

---

### Logging & Monitoring

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `LOG_LEVEL` | ❌ | string | `info` | Log verbosity: `error`, `warn`, `info`, `debug`, `trace` |
| `SENTRY_DSN` | ❌ | string | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` | Sentry error tracking (optional) |
| `ANALYTICS_API_KEY` | ❌ | string | `key_xxxxx` | Analytics service API key (optional) |

---

### Rate Limiting

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `RATE_LIMIT_WINDOW_MS` | ❌ | number | `900000` | Time window in milliseconds (900000ms = 15 mins) |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | number | `100` | Max requests per window per IP |

---

### Security

| Variable | Required | Type | Example | Notes |
|----------|----------|------|---------|-------|
| `BCRYPT_ROUNDS` | ❌ | number | `10` | Password hashing rounds (10-12 recommended) |
| `SESSION_SECRET` | ❌ | string | `a1b2c3d4e5f6...` | Secret for session cookies |

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Render-Specific Notes

### Internal URLs
When services are on the same Render account, use internal URLs:
- PostgreSQL: `postgresql://user:pass@dpg-xxxxx.render.internal:5432/db`
- Redis: `redis://:pass@dpg-xxxxx.render.internal:6379`

### Environment Variable Scopes
In Render, variables can have different scopes:
- **run:** Available at runtime (use for sensitive secrets)
- **build:** Available during build (use for build-time config)

---

## GitHub Secrets vs Render Environment

**GitHub Secrets** (12 variables):
- Used by GitHub Actions workflow
- Used to trigger Render deployment
- Named with uppercase: `DATABASE_URL`, `REDIS_URL`, etc.

**Render Environment** (20+ variables):
- Used at runtime by the application
- Should match GitHub Secrets but also include non-sensitive defaults
- Add both secrets (from GitHub) and defaults (like `SMTP_HOST`)

**Overlap:** Both places need the same SECRET values:
- DATABASE_URL ✅ GitHub Secret + Render Environment
- REDIS_URL ✅ GitHub Secret + Render Environment
- JWT keys ✅ GitHub Secrets + Render Environment
- CLOUDINARY keys ✅ GitHub Secrets + Render Environment
- SMTP credentials ✅ GitHub Secrets + Render Environment

**Defaults only in Render:**
- SMTP_HOST (not a secret)
- SMTP_PORT (not a secret)
- LOG_LEVEL (not a secret)
- RATE_LIMIT settings (not a secret)

---

## Common Mistakes

### ❌ Missing from Render Environment
If you set GitHub Secrets but not Render Environment:
- App will crash: `Error: DATABASE_URL is undefined`
- Solution: Add **all** variables to Render Environment tab

### ❌ Using External URLs on Render
```
WRONG:
DATABASE_URL=postgresql://user:pass@dpg-xxxxx.c-5.us-east-1.aws.neon.tech/db

RIGHT:
DATABASE_URL=postgresql://user:pass@dpg-xxxxx.render.internal:5432/db
```

### ❌ Line Breaks in Keys
```
WRONG (without line breaks):
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----MIIEvQIBADANBg...

RIGHT (with line breaks):
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBg...
-----END PRIVATE KEY-----
```

### ❌ Hardcoding Secrets
```javascript
// WRONG
const jwtSecret = "my_super_secret_key";

// RIGHT
const jwtSecret = process.env.JWT_PRIVATE_KEY;
```

---

## Verification

### Check Variables in Render
```bash
# SSH into Render and check
env | grep -E 'DATABASE_URL|REDIS_URL|JWT'
```

### Verify at Runtime
In your Node.js app:
```javascript
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
});
```

---

## Template: Copy to Render

Ready to add to Render? Here's the complete list:

```
NODE_ENV=production
PORT=3001
API_PREFIX=/api/v1
DATABASE_URL=postgresql://user:password@dpg-xxxxx.render.internal:5432/grocio_db?sslmode=require
REDIS_URL=redis://:password@dpg-xxxxx.render.internal:6379
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----
CLOUDINARY_NAME=dn7e5xkpk
CLOUDINARY_API_KEY=781619335543278
CLOUDINARY_API_SECRET=y2N1k0FnafDu-qlhnZDhWK6UVN4
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=noreply@grocio.com
CORS_ORIGINS=https://grocio.vercel.app,https://www.grocio.com
LOG_LEVEL=info
BCRYPT_ROUNDS=10
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Next Steps

1. ✅ Generate all required secrets
2. ✅ Add to GitHub Secrets (GITHUB_SECRETS_SETUP.md)
3. ✅ Add to Render Environment
4. ✅ Test deployment
5. ✅ Verify all endpoints work

See **DEPLOYMENT_CHECKLIST.md** for detailed steps.

