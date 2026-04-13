# Deployment Guide

This guide covers deploying Grocio to production. The system is containerized with Docker and can be deployed to any cloud provider (AWS, Google Cloud, DigitalOcean, Heroku, etc.).

---

## Prerequisites

- Docker & Docker Compose (or container orchestration platform)
- PostgreSQL 16+ database
- Redis 7+ cache
- Node.js 20 LTS (for local development only)
- pnpm package manager
- Git

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/grocio/grocio.git
cd grocio
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Edit with your local values
nano .env.local
```

Required variables for local development:
```env
DATABASE_URL=postgresql://grocio_user:grocio_password@localhost:5432/grocio_dev
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_PRIVATE_KEY=test_private_key
JWT_PUBLIC_KEY=test_public_key
```

### 4. Start Docker Services

```bash
docker-compose up -d
```

Verify services are healthy:
```bash
docker-compose ps
```

### 5. Run Database Migrations

```bash
pnpm --filter api prisma migrate dev
```

### 6. Seed Database (Optional)

```bash
pnpm --filter api prisma db seed
```

### 7. Start Development Servers

```bash
pnpm dev
```

This starts:
- API: http://localhost:3001
- Web: http://localhost:3000

---

## Production Deployment

### 1. Prepare Environment Variables

Create production environment file with all required secrets:

```bash
# Use a secrets manager to generate/store these
export DATABASE_URL=postgresql://prod_user:SECURE_PASSWORD@prod-db.example.com:5432/grocio
export REDIS_HOST=prod-redis.example.com
export REDIS_PORT=6379
export REDIS_PASSWORD=SECURE_PASSWORD
export JWT_PRIVATE_KEY=$(cat /path/to/private.pem)
export JWT_PUBLIC_KEY=$(cat /path/to/public.pem)
export CORS_ORIGINS=https://app.grocio.com,https://admin.grocio.com
export NEXT_PUBLIC_API_URL=https://api.grocio.com
export CLOUDINARY_API_SECRET=SECURE_API_SECRET
export SENTRY_DSN=https://...
```

**Important:** Never commit secrets to git. Use a secrets manager:
- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault
- Azure Key Vault

### 2. Build Docker Images

```bash
# Build locally
docker build -f Dockerfile -t grocio-api:latest .
docker build -f apps/web/Dockerfile -t grocio-web:latest .

# Or push to registry
docker tag grocio-api:latest myregistry.azurecr.io/grocio-api:latest
docker push myregistry.azurecr.io/grocio-api:latest
```

### 3. Run Database Migrations

Before deploying new code, run migrations on production database:

```bash
# Using Docker
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  grocio-api:latest \
  pnpm prisma migrate deploy

# Or directly if you have access
pnpm prisma migrate deploy
```

### 4. Start Services with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check if services are running
curl http://localhost:3000/health
curl http://localhost:3001/api/v1/health

# Check logs
docker-compose logs -f api
docker-compose logs -f web
```

---

## Cloud Provider Deployments

### AWS (ECS + RDS + ElastiCache)

```bash
# Push images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag grocio-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/grocio-api:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/grocio-api:latest

# Create ECS task definition from docker-compose.prod.yml
# Update RDS endpoint and ElastiCache endpoint in environment
# Deploy using CloudFormation or AWS CDK
```

### Google Cloud (Cloud Run + Cloud SQL + Memorystore)

```bash
# Configure Docker to use Google Container Registry
gcloud auth configure-docker

# Build and push to GCR
docker build -f Dockerfile -t gcr.io/PROJECT_ID/grocio-api:latest .
docker push gcr.io/PROJECT_ID/grocio-api:latest

# Deploy to Cloud Run
gcloud run deploy grocio-api \
  --image gcr.io/PROJECT_ID/grocio-api:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL="postgresql://..." \
  --set-env-vars REDIS_HOST="redis.internal"
```

### DigitalOcean App Platform

```bash
# Create app.yaml
cat > app.yaml << EOF
name: grocio
services:
  api:
    image:
      registry: ghcr.io
      repository: yourusername/grocio-api
      tag: latest
    envs:
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: \${db.standard_conn_str}
      - key: REDIS_HOST
        value: \${cache.hostname}
    http_port: 3000
  web:
    image:
      registry: ghcr.io
      repository: yourusername/grocio-web
      tag: latest
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: https://\${api.app_domain}
    http_port: 3000
databases:
  - name: db
    engine: PG
    version: "16"
  - name: cache
    engine: REDIS
    version: "7"
EOF

# Deploy
doctl apps create --spec app.yaml
```

### Heroku (Simple Option)

```bash
# Create app
heroku create grocio-api
heroku create grocio-web

# Add PostgreSQL and Redis addons
heroku addons:create heroku-postgresql:standard-0 --app grocio-api
heroku addons:create heroku-redis:premium-0 --app grocio-api

# Set environment variables
heroku config:set JWT_PRIVATE_KEY="..." --app grocio-api
heroku config:set JWT_PUBLIC_KEY="..." --app grocio-api

# Deploy
git push heroku main
```

---

## Database Migrations

### Creating Migrations

When updating the Prisma schema, create a new migration:

```bash
pnpm --filter api prisma migrate dev --name add_feature_name
```

This creates a migration file in `prisma/migrations/`.

### Running Migrations

```bash
# In development
pnpm --filter api prisma migrate dev

# In production (without prompt)
pnpm --filter api prisma migrate deploy

# Reset database (development only!)
pnpm --filter api prisma migrate reset
```

### Checking Migration Status

```bash
pnpm --filter api prisma migrate status
```

---

## Scaling Recommendations

### Horizontal Scaling

**API Layer:**
- Stateless Express servers can scale horizontally
- Place behind load balancer (Nginx, HAProxy, cloud LB)
- Redis for token blacklist and caching (shared across instances)
- All instances share same DATABASE_URL

**Web Layer:**
- Next.js frontend is also stateless
- Can run multiple instances behind load balancer
- Cache control headers for static assets

**Database:**
- PostgreSQL: Use read replicas for read-heavy workloads
- Enable connection pooling (PgBouncer, Supabase)
- Consider partitioning large tables (orders, audit_logs by date)

**Cache:**
- Redis: Use Redis Cluster for multi-node setup
- Set maxmemory policy: `allkeys-lru` (evict LRU keys)
- Monitor memory usage and growth

### Load Balancing

```nginx
# Nginx configuration example
upstream api {
  server api-1:3000;
  server api-2:3000;
  server api-3:3000;
}

upstream web {
  server web-1:3000;
  server web-2:3000;
}

server {
  listen 80;
  server_name api.grocio.com;
  
  location / {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## Backup & Recovery

### Automated Backups

```bash
# PostgreSQL backup script (run via cron)
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  | gzip > "$BACKUP_DIR/grocio_$TIMESTAMP.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "grocio_*.sql.gz" -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# PostgreSQL WAL archiving (enable in postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'
archive_timeout = 300
```

### Testing Backups

Regularly test restoration:
```bash
# Restore to test database
gunzip < backup.sql.gz | psql -h localhost -U postgres -d test_db
```

---

## Monitoring & Logging

See [MONITORING.md](MONITORING.md) for detailed setup of:
- Prometheus metrics
- Grafana dashboards
- ELK stack for logs
- Sentry for error tracking
- Health check endpoints

---

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs api
docker-compose logs web

# Verify environment variables
docker-compose config | grep -A 10 services:
```

### Database connection errors

```bash
# Test connection
psql -h localhost -U grocio_user -d grocio_dev

# Check DATABASE_URL format
echo $DATABASE_URL
```

### High memory usage

```bash
# Check Redis memory
redis-cli INFO memory

# Check PostgreSQL connections
psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Disk space running low

```bash
# Check PostgreSQL WAL size
du -sh $PGDATA/pg_wal/

# Clean old WAL files
pg_archivecleanup -d /archive $(psql -t -c "SELECT pg_walfile_name(pg_current_wal_lsn());")
```

---

## Rollback Procedure

If a deployment fails:

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Rollback to previous version
docker pull myregistry.azurecr.io/grocio-api:previous-tag
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f api
```

---

## Security Checklist

Before going live:

- [ ] HTTPS/TLS enabled (Let's Encrypt or equivalent)
- [ ] CORS whitelist set to actual domains (not *)
- [ ] Rate limiting tuned for production
- [ ] Database credentials in secrets manager
- [ ] JWT keys rotated and secure
- [ ] Firewall rules restrict database/Redis access
- [ ] WAF rules configured (optional)
- [ ] SSL/TLS 1.2+ enforced
- [ ] Monitoring and alerting active
- [ ] Backup and recovery tested
- [ ] Incident response plan documented

---

## Contact & Support

For deployment issues, refer to [OPERATIONS.md](OPERATIONS.md) and [MONITORING.md](MONITORING.md).
