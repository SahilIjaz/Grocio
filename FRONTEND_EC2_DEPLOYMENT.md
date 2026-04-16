# Frontend Deployment on EC2 - Complete Step-by-Step Guide

## Prerequisites
- New EC2 instance (Ubuntu 24.04, t3.micro or similar)
- Instance security group allows:
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  - Port 22 (SSH)
- SSH key pair saved locally

---

## Step 1: Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

Replace:
- `your-key.pem` with your actual key file
- `your-ec2-public-ip` with your new instance's public IP

---

## Step 2: Update System and Install Dependencies

```bash
sudo apt update
sudo apt upgrade -y
```

```bash
sudo apt install -y curl git nodejs npm
```

---

## Step 3: Install pnpm

```bash
sudo npm install -g pnpm
```

Verify:
```bash
pnpm --version
```

---

## Step 4: Clone Your Repository

```bash
cd /home/ubuntu
git clone https://github.com/SahilIjaz/Grocio.git
cd Grocio
```

---

## Step 5: Install Dependencies

```bash
pnpm install --frozen-lockfile
```

---

## Step 6: Build the Frontend

```bash
pnpm build --filter=@grocio/web
```

---

## Step 7: Install Nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Step 8: Get SSL Certificate (Choose One)

### Option A: Self-signed (Quick, for testing)
```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -newkey rsa:4096 -nodes -out /etc/nginx/ssl/cert.pem -keyout /etc/nginx/ssl/key.pem -days 365 -subj "/CN=your-ec2-ip"
```

### Option B: Let's Encrypt (If you have a domain)
```bash
sudo certbot certonly --standalone -d your-domain.com
```

---

## Step 9: Configure Nginx

Create Nginx config file:

```bash
sudo nano /etc/nginx/sites-available/grocio
```

Paste this config:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;

    # Frontend root
    root /home/ubuntu/Grocio/apps/web/.next/standalone/apps/web;

    # Next.js public files
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend
    location /api/ {
        proxy_pass https://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_ssl_verify off;
    }

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

---

## Step 10: Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/grocio /etc/nginx/sites-enabled/grocio
```

Remove default site:
```bash
sudo rm /etc/nginx/sites-enabled/default
```

---

## Step 11: Test and Start Nginx

Test configuration:
```bash
sudo nginx -t
```

Start Nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 12: Verify Deployment

Test HTTP → HTTPS redirect:
```bash
curl -I http://your-ec2-ip
```

Test HTTPS:
```bash
curl -k https://your-ec2-ip
```

Or open in browser:
```
https://your-ec2-ip
```

---

## Step 13: (Optional) Add Custom Domain

If you have a domain, update AWS Route 53:

1. Go to AWS Console → Route 53
2. Create hosted zone for your domain
3. Add A record:
   - Name: `grocio.com` (or subdomain)
   - Type: `A`
   - Value: Your new EC2 instance's public IP

Then get real SSL certificate:
```bash
sudo certbot certonly --nginx -d grocio.com
```

---

## Troubleshooting

### Nginx won't start
```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -xe
```

### Can't connect to backend
- Check backend is running: `pm2 list` on old EC2
- Check security groups allow traffic
- Verify API URL in Nginx config

### SSL certificate errors
- For self-signed: browsers will warn, that's normal
- For Let's Encrypt: ensure domain is pointing to EC2

### Frontend shows blank page
- Check browser console for errors
- Verify `.next` directory exists: `ls -la /home/ubuntu/Grocio/apps/web/.next`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

---

## Useful Commands

```bash
# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# Rebuild frontend
cd /home/ubuntu/Grocio
pnpm build --filter=@grocio/web
sudo systemctl restart nginx
```

---

## Summary

After completing these steps:
- Frontend: `https://your-ec2-ip` (or `https://your-domain.com`)
- Backend: `https://your-other-ec2-ip:3001`
- Both use HTTPS with SSL certificates
- Nginx handles frontend & proxies API requests

---

**Once done with setup, tell me your new EC2 IP and I'll verify everything is working!**
