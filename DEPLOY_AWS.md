# Deploy Backend to AWS - Complete Guide

Deploy your Grocio backend to AWS using EC2 or ECS. This guide covers both options.

---

## **Option 1: AWS EC2 (Recommended for Beginners)**

Simple, straightforward deployment on a single server.

### **Step 1: Create AWS Account**
1. Go to https://aws.amazon.com
2. Click "Create AWS Account"
3. Complete sign-up with email and payment method

### **Step 2: Launch EC2 Instance**

1. Go to AWS Console → EC2 Dashboard
2. Click **"Launch Instances"**
3. Configure:
   - **Name:** `grocio-api`
   - **AMI:** Ubuntu 22.04 LTS (Free Tier eligible)
   - **Instance Type:** `t2.micro` (Free Tier)
   - **Key Pair:** Create new → name: `grocio-key` → Download `.pem` file
   - **Network Settings:** Allow SSH (port 22), HTTP (80), HTTPS (443)
   - **Storage:** 30GB (Free Tier)

4. Click **"Launch Instance"**

### **Step 3: Connect to EC2**

```bash
# Make key file readable
chmod 400 grocio-key.pem

# SSH into your instance
ssh -i grocio-key.pem ubuntu@your-ec2-ip
```

Replace `your-ec2-ip` with your instance's public IP from AWS Console.

### **Step 4: Install Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install PM2 (process manager)
npm install -g pm2
```

### **Step 5: Clone Your Repository**

```bash
cd /home/ubuntu

# Clone your repo
git clone https://github.com/SahilIjaz/Grocio.git

cd Grocio
```

### **Step 6: Install Dependencies**

```bash
pnpm install --frozen-lockfile
```

### **Step 7: Build the API**

```bash
pnpm build --filter=@grocio/api
```

### **Step 8: Create Environment File**

```bash
cd apps/api
nano .env
```

Paste this and fill in your values:

```
NODE_ENV=production
PORT=3001
API_PREFIX=/api/v1

DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/grocio_db
REDIS_URL=redis://:password@your-elasticache-endpoint:6379

JWT_PRIVATE_KEY=your_private_key_here
JWT_PUBLIC_KEY=your_public_key_here

CLOUDINARY_NAME=dn7e5xkpk
CLOUDINARY_API_KEY=781619335543278
CLOUDINARY_API_SECRET=y2N1k0FnafDu-qlhnZDhWK6UVN4

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

CORS_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com

LOG_LEVEL=info
BCRYPT_ROUNDS=10
SESSION_SECRET=generate_random_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### **Step 9: Set Up Database**

Create RDS PostgreSQL:

1. Go to AWS Console → RDS
2. Click **"Create Database"**
3. Configure:
   - **Engine:** PostgreSQL 15
   - **DB Instance:** `db.t3.micro` (Free Tier)
   - **Database name:** `grocio_db`
   - **Master username:** `grocio_user`
   - **Master password:** Create strong password
   - **Publicly accessible:** Yes (for initial setup)

4. Click **"Create"**
5. Wait 5-10 minutes for creation
6. Get the endpoint from RDS dashboard

### **Step 10: Run Migrations**

```bash
# From apps/api directory with .env set
pnpm prisma migrate deploy
```

### **Step 11: Start Your API with PM2**

```bash
# From apps/api directory
pm2 start dist/server.js --name "grocio-api"

# Make it restart on reboot
pm2 startup
pm2 save
```

### **Step 12: Set Up Reverse Proxy (Nginx)**

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/grocio
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the config:

```bash
sudo ln -s /etc/nginx/sites-available/grocio /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### **Step 13: Set Up SSL with Let's Encrypt**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### **Step 14: Test Your API**

```bash
curl https://your-domain.com/api/v1/health
# Should return: {"status":"ok"}
```

---

## **Option 2: AWS ECS (Docker Container)**

Use containerized deployment with ECS.

### **Step 1: Create ECR Repository**

1. Go to AWS Console → ECR
2. Click **"Create Repository"**
3. Name: `grocio-api`
4. Click **"Create"**

### **Step 2: Build and Push Docker Image**

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t grocio-api:latest apps/api/

# Tag image
docker tag grocio-api:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/grocio-api:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/grocio-api:latest
```

### **Step 3: Create ECS Cluster**

1. Go to AWS Console → ECS
2. Click **"Create Cluster"**
3. Name: `grocio-cluster`
4. Infrastructure: EC2
5. Click **"Create"**

### **Step 4: Create Task Definition**

1. Go to **"Task Definitions"**
2. Click **"Create new task definition"**
3. Configure:
   - **Name:** `grocio-api-task`
   - **Container image:** Your ECR image URI
   - **Port:** 3001
   - **Environment variables:** Add from your .env file
4. Click **"Create"**

### **Step 5: Create Service**

1. Go to your cluster
2. Click **"Create service"**
3. Configure:
   - **Task definition:** Select the one you created
   - **Number of tasks:** 2 (for redundancy)
   - **Load balancer:** Enable ALB
4. Click **"Create service"**

---

## **Option 3: AWS Lightsail (Easiest)**

Simplified AWS hosting (similar to Render).

### **Step 1: Create Lightsail Instance**

1. Go to AWS Console → Lightsail
2. Click **"Create Instance"**
3. Configure:
   - **Platform:** Linux/Unix
   - **Blueprint:** Node.js 20
   - **Plan:** $5/month
   - **Name:** `grocio-api`

### **Step 2: SSH into Instance**

Use the browser-based terminal or SSH with your key pair.

### **Step 3: Deploy Code**

Same as EC2 steps 5-12 above.

---

## **Recommended: EC2 + RDS + Route53 + CloudFront**

For production, this is the best setup:

- **EC2:** Runs your API
- **RDS:** PostgreSQL database
- **ElastiCache:** Redis for caching
- **Route53:** DNS management
- **ALB:** Load balancer (optional)
- **CloudFront:** CDN (optional)

---

## **Costs Estimate**

- EC2 t2.micro: FREE (first year)
- RDS db.t3.micro: FREE (first year)
- ElastiCache t3.micro: ~$15/month
- Data transfer: ~$1/month
- **Total (Year 1):** ~$16/month

After free tier:
- **EC2 t2.micro:** ~$7/month
- **RDS db.t3.micro:** ~$35/month
- **ElastiCache:** ~$15/month
- **Total:** ~$57/month

---

## **Step-by-Step Summary**

### **Quick Start (EC2 Route):**

1. ✅ Create AWS Account
2. ✅ Launch EC2 instance (t2.micro)
3. ✅ SSH into instance
4. ✅ Install Node.js, pnpm
5. ✅ Clone repository
6. ✅ Install dependencies & build
7. ✅ Create RDS PostgreSQL database
8. ✅ Create .env file
9. ✅ Run migrations
10. ✅ Start with PM2
11. ✅ Set up Nginx reverse proxy
12. ✅ Configure SSL with Let's Encrypt
13. ✅ Point domain with Route53
14. ✅ Test with curl

---

## **Troubleshooting**

### **Can't connect to EC2**
- Check security group allows SSH (port 22)
- Verify key pair permissions: `chmod 400 key.pem`

### **API won't start**
- Check logs: `pm2 logs grocio-api`
- Verify .env file is in `apps/api/`
- Check all environment variables are set

### **Database connection fails**
- Verify RDS security group allows port 5432
- Check DATABASE_URL is correct
- Test connection: `psql -h endpoint -U user -d grocio_db`

### **Port 3001 already in use**
```bash
# Kill process
sudo lsof -i :3001
sudo kill -9 PID
```

---

## **Next Steps**

1. ✅ Deploy backend to EC2
2. Deploy frontend to Vercel
3. Update frontend API_URL to point to your domain
4. Set up monitoring with CloudWatch
5. Set up backups for RDS
6. Configure auto-scaling (optional)

---

## **AWS Resources**

- EC2 Docs: https://docs.aws.amazon.com/ec2/
- RDS Docs: https://docs.aws.amazon.com/rds/
- Lightsail: https://docs.aws.amazon.com/lightsail/
- Route53: https://docs.aws.amazon.com/route53/

