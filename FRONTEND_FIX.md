# Frontend Fix - Vercel Deployment

## Issue
Frontend is showing "load failed" when trying to fetch from backend API.

## Root Cause
Likely one of:
1. NEXT_PUBLIC_API_URL not injected during build
2. Vercel build cache is stale
3. Old build configuration still being used

## Solution

### Step 1: Clear Vercel Build Cache
1. Go to: https://vercel.com/SahilIjaz/grocio/settings/general
2. Scroll down to "Build & Development Settings"
3. Click "Clear Cache"
4. Confirm

### Step 2: Verify Settings
In the same settings page, verify:
- **Framework Preset**: Next.js
- **Build Command**: (leave blank or default)
- **Output Directory**: (leave blank or default)
- **Install Command**: (leave blank or default)

### Step 3: Check Root Directory
1. Go to: https://vercel.com/SahilIjaz/grocio/settings/general
2. Look for "Root Directory" 
3. It should be empty or "." (NOT "apps/web")
4. If it says "apps/web", change it back to "."

### Step 4: Verify Environment Variable
1. Go to: https://vercel.com/SahilIjaz/grocio/settings/environment-variables
2. You should see:
   - **Name**: NEXT_PUBLIC_API_URL
   - **Value**: http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001
   - **Environments**: Production, Preview, Development (all checked)

### Step 5: Redeploy
1. Go to: https://vercel.com/SahilIjaz/grocio/deployments
2. Find the latest deployment
3. Click the "..." menu
4. Select "Redeploy"
5. Wait for build to complete

## Verification

Once deployed, test in your browser:

1. Open your Vercel URL (e.g., https://grocio-*.vercel.app)
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Refresh the page
5. Look for API calls starting with "http://ec2-13-53..."
6. If they fail, check the response for error message

## If Still Not Working

Check Vercel build logs:
1. Go to Deployments
2. Click on the latest deployment
3. Click "Logs" tab
4. Look for any errors during build or runtime

Check browser console:
1. Press F12
2. Go to Console tab
3. Look for CORS errors or fetch errors
4. The error message will tell you exactly what's wrong

## Backend Testing

Backend is confirmed working. Test with:

```bash
curl http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001/api/v1/health
```

This should return:
```json
{"status":"ok","timestamp":"2026-04-16T..."}
```

## Quick Checklist

- [ ] Vercel build cache cleared
- [ ] Environment variable set (NEXT_PUBLIC_API_URL)
- [ ] Root directory is "." (not apps/web)
- [ ] Framework preset is Next.js
- [ ] Redeployed after making changes
- [ ] Build completed successfully
- [ ] Can access frontend URL
- [ ] API calls are going to correct URL
