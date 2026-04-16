# GitHub Secrets Setup Guide

Complete step-by-step instructions to configure all required secrets for backend deployment.

---

## Step 1: Access GitHub Secrets Settings

1. Go to your GitHub repository: `https://github.com/yourusername/Grocio`
2. Click **Settings** (top right)
3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"** for each variable below

---

## Step 2: Required GitHub Secrets

Add each of these secrets one by one:

### 1. **RENDER_DEPLOY_HOOK_URL**

**Get the value:**
- Go to [Render Dashboard](https://dashboard.render.com)
- Select your API Web Service (`grocio-api`)
- Click **Settings** → Scroll down to **"Deploy Hook"**
- Copy the full URL

**Add to GitHub:**
- Secret name: `RENDER_DEPLOY_HOOK_URL`
- Paste the URL you copied
- Click **"Add secret"**

---

### 2. **DATABASE_URL**

**Get the value:**
- Go to [Render Dashboard](https://dashboard.render.com)
- Click on your PostgreSQL service (`grocio-postgres`)
- In **Connections** section, copy the **Internal Database URL**
- Should look like: `postgresql://grocio_user:password@dpg-xxxxx.render.internal:5432/grocio_db?sslmode=require`

**Add to GitHub:**
- Secret name: `DATABASE_URL`
- Paste the connection string
- Click **"Add secret"**

---

### 3. **REDIS_URL**

**Get the value:**
- Go to [Render Dashboard](https://dashboard.render.com)
- Click on your Redis service (`grocio-redis`)
- Copy the **Redis URL** from connections section
- Should include password: `redis://:password@dpg-xxxxx.render.internal:6379`

**Add to GitHub:**
- Secret name: `REDIS_URL`
- Paste the Redis URL
- Click **"Add secret"**

---

### 4. **JWT_PRIVATE_KEY**

**Generate the value:**

Open terminal and run:

```bash
# Generate 4096-bit RSA private key
openssl genrsa -out private.key 4096

# View and copy the key
cat private.key
```

Copy the entire output (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

**Add to GitHub:**
- Secret name: `JWT_PRIVATE_KEY`
- Paste the private key (keep line breaks)
- Click **"Add secret"**

---

### 5. **JWT_PUBLIC_KEY**

**Generate the value:**

Using the same private key from above:

```bash
# Generate public key from private key
openssl rsa -in private.key -pubout -out public.key

# View and copy the key
cat public.key
```

Copy the entire output (including `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----`)

**Add to GitHub:**
- Secret name: `JWT_PUBLIC_KEY`
- Paste the public key (keep line breaks)
- Click **"Add secret"**

---

### 6. **CLOUDINARY_NAME**

**Get the value:**
- Go to [Cloudinary Dashboard](https://cloudinary.com/console)
- Copy your **Cloud name** from the top

**Add to GitHub:**
- Secret name: `CLOUDINARY_NAME`
- Paste the cloud name (e.g., `dn7e5xkpk`)
- Click **"Add secret"**

---

### 7. **CLOUDINARY_API_KEY**

**Get the value:**
- In [Cloudinary Dashboard](https://cloudinary.com/console)
- Find your **API Key**

**Add to GitHub:**
- Secret name: `CLOUDINARY_API_KEY`
- Paste the API key
- Click **"Add secret"**

---

### 8. **CLOUDINARY_API_SECRET**

**Get the value:**
- In [Cloudinary Dashboard](https://cloudinary.com/console)
- Find your **API Secret**

**Add to GitHub:**
- Secret name: `CLOUDINARY_API_SECRET`
- Paste the API secret
- Click **"Add secret"**

---

### 9. **SMTP_USER**

**Get the value:**
- Your email address (e.g., `your_email@gmail.com`)

**Add to GitHub:**
- Secret name: `SMTP_USER`
- Paste your email
- Click **"Add secret"**

---

### 10. **SMTP_PASSWORD**

**Get the value:**

For Gmail:
1. Enable 2-factor authentication: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Select **Mail** and **Windows Computer** (or your device)
4. Copy the 16-character password

**Add to GitHub:**
- Secret name: `SMTP_PASSWORD`
- Paste the app password (without spaces)
- Click **"Add secret"**

---

### 11. **CORS_ORIGINS** (Optional but Recommended)

**Get the value:**
- Your Vercel frontend URL (e.g., `https://grocio.vercel.app`)

**Add to GitHub:**
- Secret name: `CORS_ORIGINS`
- Paste: `https://grocio.vercel.app,https://www.grocio.com`
- Click **"Add secret"**

---

### 12. **SESSION_SECRET** (Optional)

**Generate the value:**

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Add to GitHub:**
- Secret name: `SESSION_SECRET`
- Paste the generated secret
- Click **"Add secret"**

---

## Step 3: Verify All Secrets Added

Go back to your GitHub repository:
1. Settings → **"Secrets and variables"** → **"Actions"**
2. You should see all secrets listed:
   - ✅ RENDER_DEPLOY_HOOK_URL
   - ✅ DATABASE_URL
   - ✅ REDIS_URL
   - ✅ JWT_PRIVATE_KEY
   - ✅ JWT_PUBLIC_KEY
   - ✅ CLOUDINARY_NAME
   - ✅ CLOUDINARY_API_KEY
   - ✅ CLOUDINARY_API_SECRET
   - ✅ SMTP_USER
   - ✅ SMTP_PASSWORD
   - ✅ CORS_ORIGINS
   - ✅ SESSION_SECRET

---

## Step 4: Add Secrets to Render Environment (Important!)

GitHub Secrets are only used during CI/CD. You must ALSO add these to Render's environment:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your API Web Service (`grocio-api`)
3. Click **Settings** → **Environment**
4. Add each environment variable:

```
NODE_ENV=production
PORT=3001
API_PREFIX=/api/v1
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@grocio.com
CORS_ORIGINS=https://your-frontend.vercel.app
LOG_LEVEL=info
BCRYPT_ROUNDS=10
SESSION_SECRET=your_session_secret
```

5. Click **"Save"**

---

## Step 5: Test the Deployment

1. Make a small change to your code (e.g., update a comment in `apps/api/src/server.ts`)
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```

3. Watch the deployment:
   - GitHub: Go to Actions tab → See workflow running
   - Render: Dashboard → Your service → Logs tab → See deployment progress

---

## Troubleshooting

### "Secret not found" error in workflow

**Solution:**
- Verify secret name matches exactly in the workflow file
- Secret names are case-sensitive
- Check you added it to the correct repository (not a fork)

### Deployment succeeds but app crashes

**Solution:**
- Check Render logs for errors
- Verify all environment variables are set in Render (not just GitHub)
- Test locally: `DATABASE_URL=... REDIS_URL=... npm start`

### Can't generate JWT keys

**Solution:**
If OpenSSL is not installed:

**macOS:**
```bash
brew install openssl
```

**Windows:**
- Use WSL (Windows Subsystem for Linux), OR
- Download OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html

**Linux:**
```bash
sudo apt-get install openssl
```

---

## Security Best Practices

✅ **DO:**
- Use strong, random values for SESSION_SECRET and JWT keys
- Rotate secrets periodically
- Keep private keys (JWT_PRIVATE_KEY) truly private
- Use app-specific passwords for email (not your actual password)

❌ **DON'T:**
- Commit `.env` files to git
- Share secrets in Slack, emails, or documentation
- Use the same secret for multiple services
- Store secrets anywhere except GitHub Secrets and Render Environment

---

## Need Help?

- GitHub Secrets docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Render docs: https://render.com/docs
- OpenSSL commands: https://www.ssl.com/article/how-to-generate-rsa-key-pair/

