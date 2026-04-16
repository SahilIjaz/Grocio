# Deployment Setup Guide

## Current Status

### ✅ API (EC2)
- **GitHub Actions Workflow**: Triggered and deploying
- **Status Page**: https://github.com/SahilIjaz/Grocio/actions
- **Public URL**: `http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001`
- **Health Check**: `http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001/api/v1/health`

### 📋 Frontend (Vercel)
- **Frontend Code**: ✅ Built successfully, pushed to GitHub
- **Status**: Waiting for Vercel environment variable setup

---

## Vercel Frontend Setup

Follow these steps to deploy your Next.js frontend to Vercel:

### Step 1: Add Environment Variable to Vercel

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Click on your **Grocio** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in the following:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001`
   - **Environments**: Select "Production", "Preview", and "Development"
6. Click **Save**

### Step 2: Trigger Redeploy

1. Go to **Deployments** tab
2. Find the latest deployment (should be in "Queued" or "Building" state)
3. If it's already built, click **Redeploy** on the latest commit
4. Wait for the build to complete (~5-10 minutes)

### Step 3: Verify Deployment

Once deployed, your frontend will be available at your Vercel URL.

---

## Backend API Setup (Automatic via GitHub Actions)

The API deployment is handled automatically by GitHub Actions when you push to the `main` branch.

### Current Deployment Process:
1. ✅ Code pushed to main branch
2. ⏳ GitHub Actions builds the API
3. ⏳ GitHub Actions SSH into EC2 and deploys
4. ⏳ PM2 restarts the API process

### Verification:

Wait for the GitHub Actions workflow to complete, then test:

```bash
# Test the health endpoint
curl http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2026-04-16T..."}
```

---

## Environment Variables Reference

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL`: Backend API URL (set in Vercel dashboard)

### Backend (EC2)
These should already be set on your EC2 instance in the `.env` file:
- `DATABASE_URL`: PostgreSQL connection string (Neon)
- `REDIS_URL`: Redis connection string (RedisLabs)
- `JWT_SECRET`: Secret for JWT signing
- `CLOUDINARY_*`: Cloudinary credentials for image uploads
- `SMTP_*`: Email service credentials (if configured)

---

## Troubleshooting

### API Not Responding
1. Check GitHub Actions deployment: https://github.com/SahilIjaz/Grocio/actions
2. SSH into EC2 and check PM2 status:
   ```
   pm2 list
   pm2 logs grocio-api
   ```

### Frontend Build Failed
1. Check Vercel deployment logs
2. Verify `NEXT_PUBLIC_API_URL` is set
3. Try redeploying from Vercel dashboard

### CORS Errors
- Backend CORS is already configured to accept all origins (`*`)
- Make sure the API URL in `NEXT_PUBLIC_API_URL` is correct

---

## Quick Links

- **GitHub Repository**: https://github.com/SahilIjaz/Grocio
- **GitHub Actions**: https://github.com/SahilIjaz/Grocio/actions
- **Vercel Dashboard**: https://vercel.com/dashboard
- **EC2 Instance**: ec2-13-53-205-180.eu-north-1.compute.amazonaws.com
