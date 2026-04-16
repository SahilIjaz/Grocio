# Deployment Files Summary

This document summarizes all files created for backend deployment to Render using GitHub Actions.

---

## Files Created

### 1. **`.github/workflows/deploy-backend.yml`**
- **Purpose:** GitHub Actions workflow for CI/CD
- **What it does:**
  - Runs on every push to `main` branch (if `apps/api/` or related files changed)
  - Installs dependencies using pnpm
  - Runs type checks and linters
  - Builds the API
  - Runs tests
  - Triggers Render deploy hook on success
- **Key env vars used:** `RENDER_DEPLOY_HOOK_URL`
- **Triggered by:** Git push to main branch

### 2. **`.env.example`**
- **Purpose:** Template for environment variables
- **What it contains:**
  - All required environment variables with descriptions
  - Database, Redis, JWT, Cloudinary config
  - Email, logging, rate limiting settings
  - Security and optional service configs
- **Usage:** Copy to `.env.local` locally, use as reference for Render setup
- **Updated:** ✅ (removed hardcoded secrets)

### 3. **`render.yaml`**
- **Purpose:** Infrastructure-as-Code for Render services
- **What it defines:**
  - PostgreSQL database service
  - Redis cache service
  - Backend API web service
  - Environment variables configuration
  - Pre-deploy migration commands
- **Optional:** Can use this for automatic service creation (vs manual setup)

### 4. **`DEPLOY_BACKEND.md`** (Comprehensive Guide)
- **Purpose:** Step-by-step deployment instructions
- **Sections:**
  - Prerequisites checklist
  - Setting up Render services (DB, Redis, API)
  - Generating deploy hooks
  - GitHub Secrets configuration
  - Complete environment variables list
  - Deployment workflow explanation
  - Troubleshooting guide
  - Monitoring instructions

### 5. **`GITHUB_SECRETS_SETUP.md`** (Secrets Configuration)
- **Purpose:** Detailed steps to configure GitHub Secrets
- **Includes:**
  - Step-by-step instructions for each secret
  - Where to find each value
  - How to generate JWT keys
  - How to generate app-specific passwords
  - Verification checklist
  - Security best practices

### 6. **`DEPLOYMENT_CHECKLIST.md`** (Pre-Deployment Tasks)
- **Purpose:** Phase-by-phase checklist to track deployment progress
- **Phases:**
  1. Local preparation
  2. GitHub setup
  3. Key generation
  4. Render service setup
  5. GitHub Secrets
  6. Render environment variables
  7. Database migrations
  8. Code push
  9. Monitor deployment
  10. Test endpoints
  11. Frontend integration
  12. Post-deployment

### 7. **`DEPLOYMENT_FILES_SUMMARY.md`** (This file)
- **Purpose:** Quick reference of all created files and their purposes

---

## Required Secrets for GitHub Actions

Add these to GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Where to Get | Example |
|--------|--------------|---------|
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → Web Service → Deploy Hook | `https://api.render.com/deploy/srv-xxxxx?key=xxxxx` |
| `DATABASE_URL` | Render PostgreSQL → Connections | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Render Redis → Connections | `redis://:pass@host:6379` |
| `JWT_PRIVATE_KEY` | Generate with OpenSSL | `-----BEGIN PRIVATE KEY-----...` |
| `JWT_PUBLIC_KEY` | Generate with OpenSSL | `-----BEGIN PUBLIC KEY-----...` |
| `CLOUDINARY_NAME` | Cloudinary dashboard | `dn7e5xkpk` |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard | `781619335543278` |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard | `y2N1k0FnafDu-qlhnZDhWK6UVN4` |
| `SMTP_USER` | Your email | `your_email@gmail.com` |
| `SMTP_PASSWORD` | Gmail app password | Generated in Gmail settings |
| `CORS_ORIGINS` | Your Vercel frontend URL | `https://grocio.vercel.app` |
| `SESSION_SECRET` | Generate random | `openssl rand -hex 32` |

---

## Required Environment Variables in Render

Set these in Render → Web Service → Settings → Environment:

```
NODE_ENV=production
PORT=3001
API_PREFIX=/api/v1
DATABASE_URL=<from GitHub secret>
REDIS_URL=<from GitHub secret>
JWT_PRIVATE_KEY=<from GitHub secret>
JWT_PUBLIC_KEY=<from GitHub secret>
CLOUDINARY_NAME=<from GitHub secret>
CLOUDINARY_API_KEY=<from GitHub secret>
CLOUDINARY_API_SECRET=<from GitHub secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<from GitHub secret>
SMTP_PASSWORD=<from GitHub secret>
SMTP_FROM=noreply@grocio.com
CORS_ORIGINS=<from GitHub secret>
LOG_LEVEL=info
BCRYPT_ROUNDS=10
SESSION_SECRET=<from GitHub secret>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Quick Setup Steps

### 1. **Push workflow file**
```bash
git add .github/workflows/deploy-backend.yml
git commit -m "ci: add backend deployment workflow"
git push origin main
```

### 2. **Generate JWT keys**
```bash
openssl genrsa -out private.key 4096
openssl rsa -in private.key -pubout -out public.key
cat private.key  # Copy to GITHUB SECRET
cat public.key   # Copy to GITHUB SECRET
```

### 3. **Create Render services**
- PostgreSQL database
- Redis cache
- Web service for API

### 4. **Get connection strings**
- DATABASE_URL from PostgreSQL
- REDIS_URL from Redis
- RENDER_DEPLOY_HOOK_URL from Web Service

### 5. **Add GitHub Secrets**
Add 12 secrets to GitHub (follow GITHUB_SECRETS_SETUP.md)

### 6. **Add Render Environment Variables**
Add all variables to Render Web Service Environment

### 7. **Push code**
```bash
git push origin main
# GitHub Actions will run
# Render will auto-deploy
```

### 8. **Verify**
```bash
curl https://your-api.onrender.com/api/v1/health
# Should return: {"status":"ok"}
```

---

## Deployment Workflow

```
┌─────────────────────────┐
│  Code Push to main      │
│  git push origin main   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  GitHub Actions         │
│  - Install deps         │
│  - Type check           │
│  - Lint                 │
│  - Build API            │
│  - Run tests            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Trigger Render Hook    │
│  Webhook call           │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Render Deployment      │
│  - Pull code            │
│  - Install deps         │
│  - Run migrations       │
│  - Build & start        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  API Live               │
│  Ready for requests     │
└─────────────────────────┘
```

---

## File Locations

```
Grocio/
├── .github/
│   └── workflows/
│       └── deploy-backend.yml          ← GitHub Actions workflow
├── .env.example                         ← Environment template
├── render.yaml                          ← Render IaC config
├── DEPLOY_BACKEND.md                    ← Main deployment guide
├── GITHUB_SECRETS_SETUP.md              ← Secrets configuration
├── DEPLOYMENT_CHECKLIST.md              ← Phase-by-phase checklist
├── DEPLOYMENT_FILES_SUMMARY.md          ← This file
└── apps/
    └── api/
        ├── src/server.ts                ← Must use process.env.PORT
        └── package.json
```

---

## Important Notes

### Security
- ✅ Never commit `.env` files (only `.env.example`)
- ✅ Use GitHub Secrets for sensitive values
- ✅ Rotate JWT keys periodically
- ✅ Use app-specific passwords for email

### Render Configuration
- Set environment variables in **both**:
  - GitHub Secrets (for CI/CD)
  - Render Environment (for runtime)
- Use Internal URLs for services within Render
- Enable auto-deploy after initial setup

### Server Requirements
- Express server must listen on `process.env.PORT`
- Current code: `app.listen(3001, ...)`
- Change to: `app.listen(process.env.PORT || 3001, ...)`

---

## Next Steps

1. **Review files created:**
   - ✅ `.github/workflows/deploy-backend.yml`
   - ✅ `.env.example` (updated)
   - ✅ `render.yaml`
   - ✅ `DEPLOY_BACKEND.md`
   - ✅ `GITHUB_SECRETS_SETUP.md`
   - ✅ `DEPLOYMENT_CHECKLIST.md`

2. **Follow DEPLOYMENT_CHECKLIST.md** phase by phase

3. **After backend is live:**
   - Deploy frontend to Vercel
   - Configure custom domain
   - Set up monitoring
   - Enable backups

---

## Support & Resources

- **Render Docs:** https://render.com/docs
- **GitHub Actions:** https://docs.github.com/en/actions
- **Prisma Migrations:** https://www.prisma.io/docs/orm/prisma-migrate/overview
- **OpenSSL Keys:** https://www.ssl.com/article/how-to-generate-rsa-key-pair

---

## Questions?

Refer to:
1. **DEPLOYMENT_CHECKLIST.md** - for step-by-step guidance
2. **GITHUB_SECRETS_SETUP.md** - for secret configuration
3. **DEPLOY_BACKEND.md** - for detailed instructions
4. **Render logs** - for deployment errors

All files are self-contained and reference each other for comprehensive coverage.

