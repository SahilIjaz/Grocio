# Operations Guide

Operational procedures for running Grocio in production.

---

## Health Checks

### API Health Endpoint

```bash
curl http://localhost:3001/api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-13T10:30:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Readiness Check

```bash
curl http://localhost:3001/api/v1/ready
```

Returns 200 if database and Redis are healthy, 503 otherwise.

---

## Monitoring

### Key Metrics to Track

**Request Performance:**
- Request latency (p50, p95, p99)
- Requests per second (throughput)
- Error rate (4xx, 5xx %)
- Cache hit rate

**Database:**
- Query execution time
- Connection pool usage
- Slow queries (> 1s)
- Disk usage

**Application:**
- CPU usage
- Memory usage
- Active connections
- Token blacklist size (Redis)

### Prometheus Metrics

Endpoint: `http://localhost:3001/metrics`

Key metrics:
- `http_request_duration_seconds` — request latency histogram
- `http_requests_total` — total requests counter
- `http_request_size_bytes` — request size histogram
- `db_query_duration_seconds` — query latency
- `cache_hits_total` — cache hit counter

### Grafana Dashboards

Import pre-built dashboards:
1. Login to Grafana
2. Dashboards → Import
3. Select Grocio dashboard JSON
4. Configure data source (Prometheus)

---

## Logging

### Log Levels

- **error**: Critical issues that need immediate attention
- **warn**: Potential problems (slow queries, high memory)
- **info**: Important events (login, order creation)
- **debug**: Detailed application flow (development only)

### Viewing Logs

```bash
# Docker logs (streaming)
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api

# Specific time range
docker-compose logs --since 2h api

# Filter by pattern
docker-compose logs api | grep ERROR
```

### ELK Stack Setup

**Elasticsearch + Logstash + Kibana**

```yaml
# docker-compose.yml additions
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - xpack.security.enabled=false
    - discovery.type=single-node
  ports:
    - "9200:9200"

logstash:
  image: docker.elastic.co/logstash/logstash:8.0.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  depends_on:
    - elasticsearch

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - "5601:5601"
  depends_on:
    - elasticsearch
```

Forward logs from Docker:
```bash
docker-compose logs api | nc localhost 5000
```

---

## Performance Tuning

### PostgreSQL Optimization

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000  -- > 1 second
ORDER BY mean_time DESC;

-- Add indexes for frequently filtered columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';

-- Reindex fragmented tables (maintenance)
REINDEX TABLE orders;

-- Vacuum and analyze (auto-run, but manual for urgent cases)
VACUUM ANALYZE;
```

### Redis Optimization

```bash
# Monitor real-time commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Find large keys
redis-cli --bigkeys

# Eviction strategy (production)
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Persist settings
redis-cli CONFIG REWRITE
```

### Node.js Optimization

```javascript
// Enable compression
app.use(compression());

// Set appropriate timeouts
server.setTimeout(30000);  // 30 seconds

// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Incident Response

### Security Incident

1. **Detect**
   - Unusual API traffic patterns
   - Failed login spikes
   - Database errors
   - Memory/CPU anomalies

2. **Respond**
   ```bash
   # Check logs for the incident
   docker-compose logs api | grep ERROR
   
   # Identify affected users/tenants
   SELECT * FROM audit_logs 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

3. **Contain**
   ```bash
   # Block IP address (if DDoS)
   # via firewall/WAF rules
   
   # Invalidate tokens
   redis-cli DEL blacklist:jti:*
   
   # Restart affected service
   docker-compose restart api
   ```

4. **Investigate**
   ```bash
   # Full audit log analysis
   SELECT * FROM audit_logs 
   WHERE created_at BETWEEN 
     NOW() - INTERVAL '24 hours' 
     AND NOW()
   ORDER BY created_at DESC;
   ```

5. **Recover**
   - Apply security patch
   - Rotate compromised tokens
   - Notify affected users
   - Monitor for recurrence

6. **Improve**
   - Root cause analysis
   - Add monitoring/alerting
   - Update security policies
   - Team training

---

## Scaling Operations

### Adding Capacity

```bash
# Scale API servers (if using orchestration)
docker-compose scale api=3

# Scale database read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier grocio-replica \
  --source-db-instance-identifier grocio-primary
```

### Load Testing

```bash
# Using Apache Bench
ab -n 10000 -c 100 http://localhost:3001/api/v1/products

# Using k6
k6 run load-test.js

# Using artillery
artillery quick --count 100 --num 1000 http://localhost:3001/api/v1/products
```

---

## Backup Operations

### Manual Backup

```bash
# PostgreSQL
pg_dump -h localhost -U grocio_user -d grocio > backup.sql

# Restore
psql -h localhost -U grocio_user -d grocio < backup.sql

# Redis
redis-cli BGSAVE
```

### Automated Backups

```bash
# Cron job (run daily at 2 AM)
0 2 * * * /usr/local/bin/backup-grocio.sh

# Script content
#!/bin/bash
BACKUP_DIR="/backups/grocio"
DATE=$(date +\%Y\%m\%d_\%H\%M\%S)

# PostgreSQL
pg_dump postgresql://grocio_user:password@db:5432/grocio | gzip > $BACKUP_DIR/pg_$DATE.sql.gz

# Redis
redis-cli --rdb $BACKUP_DIR/redis_$DATE.rdb

# Upload to S3
aws s3 cp $BACKUP_DIR/ s3://grocery-backups/
```

---

## Maintenance Windows

### Zero-Downtime Deployments

```bash
# 1. Scale up new version
docker-compose up -d api (new version)

# 2. Wait for health checks
curl http://localhost:3001/api/v1/health

# 3. Update load balancer to route to new version
# (via infrastructure-as-code or manual config)

# 4. Drain connections from old version
# (give existing requests 30s to complete)

# 5. Stop old version
docker-compose stop api (old version)

# 6. Verify no errors
docker-compose logs api | tail -50
```

### Database Migrations (Zero-Downtime)

```bash
# Prisma: expand/contract pattern
# 1. Add new column (backwards compatible)
# 2. Deploy code that uses both old and new
# 3. Backfill old data
# 4. Deploy code that uses new only
# 5. Drop old column

# Prisma command
pnpm prisma migrate deploy
```

---

## Alerts & Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% | Page on-call |
| Latency p99 | > 1 second | Investigate query performance |
| Database Connections | > 90% pool | Scale up connection pool |
| Redis Memory | > 80% | Clear cache / scale Redis |
| Disk Free | < 10% | Increase storage |
| CPU Usage | > 80% | Scale horizontally |
| Failed Logins | > 50/hour | Check for brute force |

---

## Regular Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor dashboard (CPU, memory, disk)
- [ ] Verify backups completed successfully
- [ ] Check alert history

### Weekly
- [ ] Review slow query logs
- [ ] Analyze traffic patterns
- [ ] Test backup restoration
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Performance tuning review
- [ ] Capacity planning analysis
- [ ] Security audit (logs, access patterns)
- [ ] Disaster recovery drill

### Quarterly
- [ ] Full security assessment
- [ ] Load testing
- [ ] Dependency updates
- [ ] Documentation review

---

## Runbooks

### Database is Down

```bash
# 1. Check database container
docker-compose ps postgres

# 2. View logs
docker-compose logs postgres

# 3. Restart
docker-compose restart postgres

# 4. Run migrations again
pnpm prisma migrate deploy

# 5. Verify data integrity
psql -c "SELECT count(*) FROM users;"
```

### Redis is Down

```bash
# 1. Check Redis container
docker-compose ps redis

# 2. View logs
docker-compose logs redis

# 3. Restart (loses cache, but that's okay)
docker-compose restart redis

# 4. Verify connection
redis-cli ping
```

### API is Crashing

```bash
# 1. Check logs
docker-compose logs api

# 2. Check recent changes
git log --oneline -5

# 3. Rollback if needed
git revert <commit-hash>
docker-compose up -d --build

# 4. Monitor closely
docker-compose logs -f api
```

---

## Contact

- **On-Call:** Pagerduty/Slack
- **Critical Issues:** Escalate to engineering lead
- **Database Emergency:** Contact DBA
