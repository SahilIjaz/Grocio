# Backend Deployment Guide - Render + GitHub Actions

This guide covers deploying your Grocio backend to Render using GitHub Actions for automated CI/CD.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setup Render](#setup-render)
3. [Configure GitHub Secrets](#configure-github-secrets)
4. [Environment Variables](#environment-variables)
5. [Deployment Process](#deployment-process)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, ensure you have:
- A GitHub repository with the Grocio project
- A Render account (https://render.com)
- A PostgreSQL database (Render's or Neon)
- A Redis instance (Render's or RedisLabs)
- API keys for external services (Cloudinary, Stripe, etc.)

---

## Setup Render

### Step 1: Create PostgreSQL Database on Render

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `grocio-postgres`
   - **Database:** `grocio_db`
   - **User:** `grocio_user`
   - **Region:** Select your closest region
   - **PostgreSQL Version:** 15+

4. Copy the **Internal Database URL** (for within Render)
   - Format: `postgresql://user:password@dpg-xxxxx.render.internal:5432/grocio_db?sslmode=require`

### Step 2: Create Redis Cache on Render

1. Click **"New +"** → **"Redis"**
2. Configure:
   - **Name:** `grocio-redis`
   - **Region:** Same as PostgreSQL
   - **Plan:** Free or Standard

3. Copy the **Redis URL** (includes password)

### Step 3: Create Web Service for API

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `grocio-api`
   - **Environment:** `Node`
   - **Region:** Same as database
   - **Branch:** `main`
   
4. Build & Start Commands:
   ```
   Build Command: pnpm install && pnpm build
   Start Command: cd apps/api && node dist/server.js
   ```

5. Click **"Create Web Service"**

### Step 4: Generate Render Deploy Hook

1. In your Render Web Service settings
2. Scroll to **"Deploy Hook"**
3. Click **"Copy Deploy Hook"**
4. Save this URL (you'll need it for GitHub Secrets)

---

## Configure GitHub Secrets

GitHub Secrets allow you to securely store sensitive data without exposing them in your repository.

### Add Secrets to GitHub

1. Go to your GitHub repository
2. Settings → **"Secrets and variables"** → **"Actions"**
3. Click **"New repository secret"**

Add the following secrets:

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `RENDER_DEPLOY_HOOK_URL` | Your Render deploy hook | Step 4 above |
| `DATABASE_URL` | PostgreSQL connection URL | Render PostgreSQL dashboard |
| `REDIS_URL` | Redis connection URL | Render Redis dashboard |
| `JWT_PRIVATE_KEY` | Your RSA private key | Generate new (see below) |
| `JWT_PUBLIC_KEY` | Your RSA public key | Generate new (see below) |
| `CLOUDINARY_NAME` | Your Cloudinary account name | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Your API key | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Your API secret | Cloudinary dashboard |
| `SMTP_USER` | Your email address | Your email provider |
| `SMTP_PASSWORD` | App-specific password | Gmail settings |
| `CORS_ORIGINS` | Your frontend URL | Your Vercel deployment |

### Generate JWT Keys

Run these commands locally to generate RSA keys:

```bash
# Generate private key
openssl genrsa -out private.key 4096

# Generate public key from private key
openssl rsa -in private.key -pubout -out public.key

# View the keys
cat private.key
cat public.key
```

Then add the contents to GitHub Secrets as `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`.

---

## Environment Variables

### Complete Environment Variables List

These are the variables your backend needs. Set them in Render's Environment section:

```bash
# Application
NODE_ENV=production
PORT=3001
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://grocio_user:password@dpg-xxxxx.render.internal:5432/grocio_db?sslmode=require

# Redis
REDIS_URL=redis://:password@dpg-xxxxx.render.internal:6379

# JWT Keys
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----

# CORS
CORS_ORIGINS=https://your-frontend.vercel.app,https://www.grocio.com

# Cloudinary
CLOUDINARY_NAME=dn7e5xkpk
CLOUDINARY_API_KEY=781619335543278
CLOUDINARY_API_SECRET=y2N1k0FnafDu-qlhnZDhWK6UVN4

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=app_specific_password
SMTP_FROM=noreply@grocio.com

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=generate_a_random_secret_key
```

### Set Variables in Render

1. Go to your Render Web Service
2. Settings → **"Environment"**
3. Add each variable listed above
4. Click **"Save"**

---

## Deployment Process

### Automated Deployment Flow

```
1. Push code to main branch
   ↓
2. GitHub Actions workflow triggered
   ↓
3. Run tests & build
   ↓
4. If successful, trigger Render deploy hook
   ↓
5. Render automatically deploys new version
   ↓
6. Run database migrations (if needed)
```

### Manual Trigger Deployment

If you need to manually deploy without pushing code:

1. Go to Render Web Service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Run Database Migrations

Before first deployment:

```bash
# Locally test migrations
cd apps/api
pnpm prisma migrate deploy

# Or use Render's pre-deploy script
# (configure in service settings)
```

---

## File Structure Required

Ensure these files exist in your repository:

```
Grocio/
├── .github/
│   └── workflows/
│       └── deploy-backend.yml          ✅ Created
├── .env.example                         ✅ Updated
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   └── server.ts               (Must listen on PORT env var)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── web/
├── packages/
│   └── types/
├── pnpm-lock.yaml
└── package.json
```

---

## Deployment Checklist

Before deploying, ensure:

- [ ] All secrets added to GitHub
- [ ] All secrets added to Render Environment
- [ ] Database migration tested locally
- [ ] API server listens on `process.env.PORT`
- [ ] `.env.example` updated with all required variables
- [ ] GitHub Actions workflow file created (`.github/workflows/deploy-backend.yml`)
- [ ] Render Web Service created and configured
- [ ] Deploy Hook URL saved to GitHub Secrets
- [ ] CORS_ORIGINS points to your frontend URL
- [ ] JWT keys generated and stored securely

---

## Troubleshooting

### Deployment Failed: "Build Command Failed"

**Solution:**
```bash
# Check build locally
pnpm install
pnpm build --filter=@grocio/api
```

Check the Render logs for specific errors.

### Database Connection Error

**Issue:** `postgresql://... refused connection`

**Solution:**
- Verify DATABASE_URL in Render Environment
- Ensure PostgreSQL service is running
- Check if IP is whitelisted (Render handles this automatically)

### Redis Connection Error

**Issue:** `WRONGPASS invalid username-password pair` or connection refused

**Solution:**
- Verify REDIS_URL in Render Environment
- Copy directly from Render Redis dashboard
- Test locally: `redis-cli -u "your_redis_url"`

### Deployment Webhook Not Triggering

**Issue:** Code pushed but deployment doesn't start

**Solution:**
1. Verify RENDER_DEPLOY_HOOK_URL in GitHub Secrets
2. Check GitHub Actions workflow logs
3. Try manual deployment from Render dashboard
4. Re-generate deploy hook in Render if needed

### Environment Variables Not Applied

**Solution:**
- Restart the service: Render dashboard → **"Manual Deploy"**
- Verify variables in Render Environment tab (not local)
- Check for typos in variable names

### Port Already in Use

**Issue:** `Error: listen EADDRINUSE :::3001`

**Solution:**
- Render automatically assigns PORT if set to dynamic
- Server.ts should use: `process.env.PORT || 3001`
- Check that other services aren't using the same port

---

## Monitoring & Logs

### View Deployment Logs

1. Render Dashboard → Your Web Service
2. Click **"Logs"** tab
3. Real-time logs appear here

### Check Health Endpoint

```bash
curl https://your-api.onrender.com/api/v1/health
# Should return: {"status":"ok"}
```

### Monitor Performance

- Render Dashboard → Metrics
- Check CPU, Memory, Bandwidth usage
- Set up alerts for high usage

---

## Next Steps

After backend is deployed:

1. **Deploy Frontend to Vercel** (see DEPLOY_FRONTEND.md)
2. **Update API URL** in frontend environment
3. **Run end-to-end tests** against production
4. **Monitor logs** for errors
5. **Set up alerts** for failures

---

## Support

For issues with:
- **Render:** https://render.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions
- **Your project:** Check logs and error messages

