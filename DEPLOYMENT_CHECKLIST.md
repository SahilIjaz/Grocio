# Backend Deployment Checklist

Complete this checklist before deploying to production.

---

## Phase 1: Preparation (Local Setup)

- [ ] Clone/update repository to latest
- [ ] Run `pnpm install` to install dependencies
- [ ] Copy `.env.example` to `.env.local`
- [ ] Test build locally: `pnpm build --filter=@grocio/api`
- [ ] Test server locally: `pnpm dev`
- [ ] Run tests locally: `pnpm test --filter=@grocio/api`
- [ ] Run type check: `pnpm type-check`
- [ ] All tests pass ✅

---

## Phase 2: GitHub Setup

- [ ] GitHub repository is public and accessible
- [ ] `.github/workflows/deploy-backend.yml` exists (✅ created)
- [ ] Workflow file is valid YAML
- [ ] Push workflow file to main branch:
  ```bash
  git add .github/workflows/deploy-backend.yml
  git commit -m "ci: add backend deployment workflow"
  git push origin main
  ```

---

## Phase 3: Generate Required Keys

Generate JWT keys (run locally):

```bash
# Private Key
openssl genrsa -out private.key 4096
cat private.key
# Copy entire output

# Public Key
openssl rsa -in private.key -pubout -out public.key
cat public.key
# Copy entire output
```

- [ ] JWT_PRIVATE_KEY generated ✅
- [ ] JWT_PUBLIC_KEY generated ✅
- [ ] Both keys saved securely (not committed to git)

---

## Phase 4: Render Setup

### Database Service
- [ ] Log in to https://render.com
- [ ] Create PostgreSQL service (`grocio-postgres`)
  - [ ] Database name: `grocio_db`
  - [ ] User: `grocio_user`
  - [ ] Region: `ohio` (or your choice)
  - [ ] PostgreSQL version: 15+
- [ ] Copy **Internal Database URL**
- [ ] PostgreSQL service is running ✅

### Redis Service
- [ ] Create Redis service (`grocio-redis`)
  - [ ] Region: Same as PostgreSQL
  - [ ] Plan: Free or Standard
- [ ] Copy **Redis URL** (with password)
- [ ] Redis service is running ✅

### Web Service (API)
- [ ] Create Web Service for backend
  - [ ] Name: `grocio-api`
  - [ ] Connect GitHub repository
  - [ ] Branch: `main`
  - [ ] Build Command: `pnpm install && pnpm build`
  - [ ] Start Command: `cd apps/api && node dist/server.js`
  - [ ] Region: Same as database
- [ ] Web Service created ✅
- [ ] Copy **Deploy Hook URL** for GitHub Secrets

---

## Phase 5: GitHub Secrets Configuration

Follow [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) to add:

- [ ] `RENDER_DEPLOY_HOOK_URL`
- [ ] `DATABASE_URL`
- [ ] `REDIS_URL`
- [ ] `JWT_PRIVATE_KEY`
- [ ] `JWT_PUBLIC_KEY`
- [ ] `CLOUDINARY_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASSWORD`
- [ ] `CORS_ORIGINS` (your Vercel frontend URL)
- [ ] `SESSION_SECRET` (optional)

**Verify:** Go to GitHub repo → Settings → Secrets → Should see 10+ secrets listed

---

## Phase 6: Render Environment Variables

- [ ] Go to Render Web Service settings
- [ ] Click **Environment**
- [ ] Add all variables from `.env.example`:

```
NODE_ENV=production
PORT=3001
API_PREFIX=/api/v1
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=10
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=noreply@grocio.com

DATABASE_URL=[from DATABASE_URL secret]
REDIS_URL=[from REDIS_URL secret]
JWT_PRIVATE_KEY=[from JWT_PRIVATE_KEY secret]
JWT_PUBLIC_KEY=[from JWT_PUBLIC_KEY secret]
CLOUDINARY_NAME=[from CLOUDINARY_NAME secret]
CLOUDINARY_API_KEY=[from CLOUDINARY_API_KEY secret]
CLOUDINARY_API_SECRET=[from CLOUDINARY_API_SECRET secret]
SMTP_USER=[from SMTP_USER secret]
SMTP_PASSWORD=[from SMTP_PASSWORD secret]
CORS_ORIGINS=[your Vercel frontend URL]
SESSION_SECRET=[generated random secret]
```

- [ ] All environment variables added to Render ✅
- [ ] Click **Save** ✅

---

## Phase 7: Database Migration Setup

### Option A: Manual Migration (Before First Deploy)
```bash
# Locally test migrations
cd apps/api
pnpm prisma migrate deploy
```
- [ ] Database migration successful ✅

### Option B: Automatic Migration (via render.yaml)
- [ ] `render.yaml` exists with preDeployCommand
- [ ] Migration runs automatically on each deploy

---

## Phase 8: Code Push & Deployment

- [ ] All changes committed locally
- [ ] No uncommitted changes: `git status` is clean
- [ ] Push to main branch:
  ```bash
  git push origin main
  ```
- [ ] GitHub Actions workflow starts automatically
- [ ] Monitor workflow: GitHub repo → **Actions** tab

---

## Phase 9: Monitor Deployment

### GitHub Actions
- [ ] Workflow runs successfully
- [ ] Build step completes ✅
- [ ] Tests pass (or skip if configured)
- [ ] Deploy hook triggered ✅

### Render
- [ ] Manual deployment starts (or triggered by webhook)
- [ ] Check Render service → **Logs** tab
- [ ] Deployment completes without errors ✅

---

## Phase 10: Test Deployment

### Health Check
```bash
# Replace with your Render API URL
curl https://your-api.onrender.com/api/v1/health
# Should return: {"status":"ok"}
```
- [ ] Health check returns 200 ✅

### Database Connection
Test an API endpoint that uses the database:
```bash
# Example: Get users endpoint
curl https://your-api.onrender.com/api/v1/users
```
- [ ] API responds with data ✅
- [ ] No database connection errors ✅

### CORS Headers
```bash
curl -H "Origin: https://your-frontend.vercel.app" \
  https://your-api.onrender.com/api/v1/health -v
# Check for Access-Control-Allow-Origin header
```
- [ ] CORS headers present ✅

---

## Phase 11: Frontend Integration

- [ ] Frontend `NEXT_PUBLIC_API_URL` points to Render API
- [ ] Test API calls from frontend
- [ ] No CORS errors in browser console ✅

---

## Phase 12: Monitoring & Maintenance

### Logs & Alerts
- [ ] Render alerts configured (optional)
- [ ] Monitor logs regularly
- [ ] Set up error tracking (optional: Sentry)

### Database Backups
- [ ] Enable automatic backups in Render PostgreSQL
- [ ] Test restore procedure

### Performance
- [ ] Monitor CPU/Memory usage
- [ ] Check response times
- [ ] Scale plan if needed

---

## Final Verification

### API Endpoints Test

Test these critical endpoints:

```bash
# Health check
curl https://your-api.onrender.com/api/v1/health

# Get users (if public)
curl https://your-api.onrender.com/api/v1/users

# Test authentication
curl -X POST https://your-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

- [ ] All critical endpoints working ✅
- [ ] No errors in Render logs ✅
- [ ] Database queries executing ✅
- [ ] Cloudinary uploads working ✅

---

## Rollback Plan

If deployment fails:

1. Check logs in Render → Logs tab
2. Identify the error
3. Fix the issue locally
4. Commit and push (auto-redeploys)
5. Or use Render dashboard → Manual Deploy → Deploy previous version

- [ ] Have rollback strategy documented ✅

---

## Post-Deployment

- [ ] Update documentation with new API URL
- [ ] Notify team of deployment
- [ ] Monitor application for errors (first 24 hours)
- [ ] Keep database backups
- [ ] Schedule regular performance reviews

---

## Issues? Check Here

| Issue | Solution |
|-------|----------|
| Build fails | Check GitHub Actions logs → local build test |
| Deployment doesn't trigger | Verify RENDER_DEPLOY_HOOK_URL in GitHub Secrets |
| App crashes | Check Render logs, verify all env vars set |
| Database connection error | Verify DATABASE_URL, test connection locally |
| CORS errors | Update CORS_ORIGINS with frontend URL |
| Secrets missing | Re-add to both GitHub Secrets AND Render Environment |

---

## Completion Status

- [ ] **All phases complete ✅**
- [ ] **Backend deployed to Render ✅**
- [ ] **Auto-deployment working ✅**
- [ ] **Ready for production ✅**

---

## Next Steps

1. Deploy frontend to Vercel (see DEPLOY_FRONTEND.md)
2. Run end-to-end tests
3. Monitor logs and performance
4. Set up CI/CD for frontend
5. Configure custom domain
6. Enable SSL/HTTPS (automatic on Render & Vercel)

