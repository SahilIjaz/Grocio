# Vercel Setup Checklist

## ✅ What's Already Done
- [x] Next.js frontend code built successfully
- [x] Code pushed to GitHub main branch
- [x] vercel.json configuration file created
- [x] GitHub repo connected to Vercel (assuming already done)

## 📝 What You Need to Do Now

### 1. Add Environment Variable in Vercel Dashboard

Go to: https://vercel.com/dashboard → Select "Grocio" project → Settings → Environment Variables

**Click "Add New":**
```
Name:  NEXT_PUBLIC_API_URL
Value: http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001
Environments: ✓ Production ✓ Preview ✓ Development
```

**Then click "Save"**

### 2. Redeploy the Frontend

Go to: Vercel Dashboard → Grocio Project → Deployments

**Find the latest deployment and click "Redeploy"**

This will rebuild with the new environment variable.

### 3. Wait for Build to Complete

The build usually takes 5-10 minutes. You'll see:
- Building... (orange)
- ✓ Ready (green) when done

### 4. Test Your Deployment

Once ready, click on your Vercel deployment URL and test:
- ✓ Home page loads
- ✓ Can browse stores and products
- ✓ API calls work (check browser console for any errors)

---

## 🔗 Important URLs

**Frontend (Vercel):** `https://your-vercel-url.vercel.app`

**Backend (EC2):** `http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001`

**Health Check:** `http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001/api/v1/health`

---

## ⚠️ Common Issues

**Issue: "Failed to fetch from API"**
- Make sure `NEXT_PUBLIC_API_URL` is set in Vercel
- Make sure EC2 API is running (check GitHub Actions workflow)
- Check browser console for exact error message

**Issue: Build fails in Vercel**
- Check Vercel build logs
- Make sure pnpm and Node.js are compatible
- Try clearing cache in Vercel and redeploying

---

## 🎯 Summary

1. Add `NEXT_PUBLIC_API_URL` environment variable in Vercel
2. Redeploy the project
3. Wait for build to complete
4. Test your application

That's it! Your full-stack app will be live.
