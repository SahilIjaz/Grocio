# Monitoring & Observability Guide

Complete setup for monitoring, logging, and alerting for Grocio in production.

---

## Overview

A comprehensive monitoring stack includes:
1. **Metrics** (Prometheus) — performance data
2. **Logs** (ELK Stack) — detailed events
3. **Traces** (Jaeger) — request flows
4. **Errors** (Sentry) — exception tracking
5. **Dashboards** (Grafana) — visualization
6. **Alerts** (AlertManager) — incident notification

---

## Metrics & Dashboards

### Prometheus Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'grocio'

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']
```

### Key Metrics to Track

**HTTP Request Metrics:**
```
http_request_duration_seconds {method, path, status}
  - Latency histogram (p50, p95, p99)
  
http_requests_total {method, path, status}
  - Total requests counter
  
http_request_size_bytes {method, path}
  - Request size histogram
  
http_response_size_bytes {method, path}
  - Response size histogram
```

**Database Metrics:**
```
db_query_duration_seconds {operation, table}
  - Query execution time
  
db_connections_active
  - Current active connections
  
db_connection_pool_size
  - Pool capacity
  
db_slow_queries_total {query_hash}
  - Slow queries (> 1s)
```

**Cache Metrics:**
```
redis_memory_used_bytes
  - Redis memory consumption
  
cache_hits_total {key_prefix}
  - Cache hit counter
  
cache_misses_total {key_prefix}
  - Cache miss counter
  
cache_evictions_total
  - Evicted keys counter
```

**Application Metrics:**
```
process_resident_memory_bytes
  - Node.js memory usage
  
process_cpu_seconds_total
  - CPU time consumed
  
nodejs_eventloop_lag_seconds
  - Event loop lag
  
nodejs_active_handles
  - Open handles count
```

### Grafana Dashboards

**Main Dashboard:**
- Request rate (req/s)
- Error rate (%)
- Latency (p50, p95, p99)
- Active connections
- CPU / Memory usage
- Database connections
- Redis memory

```json
{
  "dashboard": {
    "title": "Grocio - Main Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[1m]) / rate(http_requests_total[1m]) * 100"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Latency (p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, http_request_duration_seconds)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "db_connections_active"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Redis Memory",
        "targets": [
          {
            "expr": "redis_memory_used_bytes / 1024 / 1024"
          }
        ],
        "type": "gauge"
      }
    ]
  }
}
```

---

## Logging

### ELK Stack Setup

```yaml
# docker-compose.yml additions
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=true
    - xpack.security.enrollment.enabled=true
    - ELASTIC_PASSWORD=changeme
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data
  ports:
    - "9200:9200"
  ulimits:
    memlock:
      soft: -1
      hard: -1

kibana:
  image: docker.elastic.co/kibana/kibana:8.10.0
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    - ELASTICSEARCH_USERNAME=elastic
    - ELASTICSEARCH_PASSWORD=changeme
  ports:
    - "5601:5601"
  depends_on:
    - elasticsearch

filebeat:
  image: docker.elastic.co/beats/filebeat:8.10.0
  user: root
  volumes:
    - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
  command: filebeat -e -strict.perms=false
  depends_on:
    - elasticsearch
```

### Filebeat Configuration

```yaml
# filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata: ~
      - add_kubernetes_metadata: ~

processors:
  - add_host_metadata: ~
  - add_log_metadata: ~
  - decode_json_fields:
      fields: ['message']
      process_array: false
      max_depth: 1
      target: ''

output.elasticsearch:
  hosts: ['elasticsearch:9200']
  username: elastic
  password: changeme
  index: 'grocio-%{+yyyy.MM.dd}'
```

### Kibana Dashboards

Key visualizations:
- Error logs (red, warning, info)
- Request timeline (method, path, status)
- Top 10 endpoints (by traffic)
- Slow queries (> 1s)
- Login attempts (success vs. failure)
- Tenant activity (orders, products)

**Create Index Pattern:**
1. Kibana → Discover
2. Create index pattern: `grocio-*`
3. Time field: `@timestamp`

---

## Error Tracking

### Sentry Setup

```bash
# Docker: Start Sentry
docker run -d --name sentry-redis redis
docker run -d --name sentry-postgres \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

docker run -d -p 9000:9000 --name sentry \
  -e SENTRY_SECRET_KEY='generate-a-secret-key' \
  -e SENTRY_POSTGRES_HOST=sentry-postgres \
  -e SENTRY_REDIS_HOST=sentry-redis \
  sentry
```

### Initialize Sentry

```bash
# Setup database
docker exec sentry sentry upgrade

# Create superuser
docker exec sentry sentry createuser --email admin@example.com --password admin
```

### Application Integration

```typescript
// apps/api/src/config/sentry.ts
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

export function initSentry(app: Express) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Express.Middleware(),
      new Sentry.Integrations.OnUncaughtExceptionHandler(),
      new Sentry.Integrations.OnUnhandledRejectionHandler(),
    ],
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // ... rest of middleware

  app.use(Sentry.Handlers.errorHandler());
}
```

### Error Tracking

```typescript
// apps/api/src/utils/errorHandler.ts
import * as Sentry from "@sentry/node";

export function captureError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    contexts: {
      app: context,
    },
  });
}

// In middleware
app.use((err, req, res, next) => {
  captureError(err, {
    method: req.method,
    path: req.path,
    userId: req.user?.sub,
    tenantId: req.tenantId,
  });

  // ... send error response
});
```

---

## Alerting

### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: slack
  group_by: ['alertname', 'cluster']
  routes:
    - match:
        severity: critical
      receiver: pagerduty
    - match:
        severity: warning
      receiver: slack

receivers:
  - name: slack
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: pagerduty
    pagerduty_configs:
      - service_key: 'YOUR_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}'
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: grocio_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m])) by (job) /
           sum(rate(http_requests_total[5m])) by (job)) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate on {{ $labels.job }}'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, 
            rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High API latency'
          description: 'p99 latency is {{ $value }}s'

      # Database down
      - alert: DatabaseDown
        expr: |
          pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'PostgreSQL is down'

      # Redis down
      - alert: RedisDown
        expr: |
          redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Redis is down'

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (process_resident_memory_bytes / 1024 / 1024 / 512) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is {{ $value | humanize }}%'

      # High disk usage
      - alert: HighDiskUsage
        expr: |
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Low disk space'
          description: 'Disk usage is {{ $value | humanize }}%'

      # Too many database connections
      - alert: TooManyDatabaseConnections
        expr: |
          db_connections_active / db_connection_pool_size > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Database connection pool is {{ $value | humanizePercentage }} full'

      # High failed login rate
      - alert: HighFailedLoginRate
        expr: |
          rate(auth_login_failures_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High failed login rate'
          description: 'Failed logins: {{ $value | humanize }}/s'
```

---

## Health Checks

### API Health Endpoint

```typescript
// apps/api/src/routes/health.ts
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'checking...',
      redis: 'checking...',
    },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'connected';
  } catch (error) {
    health.checks.database = 'disconnected';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    await redis.ping();
    health.checks.redis = 'connected';
  } catch (error) {
    health.checks.redis = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check
router.get('/ready', async (req, res) => {
  const isReady = 
    (await checkDatabase()) && 
    (await checkRedis());

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({ ready: isReady });
});
```

---

## Performance Profiling

### Node.js Profiling

```bash
# Using node-inspect-native
node --prof app.js

# Generate profile
node --prof-process isolate-*.log > profile.txt
```

### Clinic.js

```bash
# Install
npm install -g clinic

# Profile
clinic doctor -- node app.js

# View results
clinic doctor --visualize profile.html
```

---

## Distributed Tracing

### Jaeger Setup

```bash
# Docker
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 5775:5775/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

### Application Integration

```typescript
// apps/api/src/config/tracing.ts
import { NodeTracerProvider } from '@opentelemetry/node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/tracing';

const provider = new NodeTracerProvider();
const jaegerExporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
provider.register();
```

---

## Custom Metrics

### Application-Specific Metrics

```typescript
// apps/api/src/metrics/orders.ts
import { Counter, Histogram } from 'prom-client';

export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['tenant_id'],
});

export const orderValueHistogram = new Histogram({
  name: 'order_value_amount',
  help: 'Order value in dollars',
  labelNames: ['tenant_id'],
  buckets: [10, 25, 50, 100, 250, 500, 1000],
});

export const ordersStatusGauge = new Gauge({
  name: 'orders_by_status',
  help: 'Orders by status',
  labelNames: ['status'],
});

// Usage
export async function createOrder(...) {
  const order = await orderRepository.create(...);
  
  ordersCreatedTotal.labels(tenantId).inc();
  orderValueHistogram.labels(tenantId).observe(order.totalAmount);
  
  return order;
}
```

---

## Alerting Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Error Rate | > 1% | Page on-call immediately |
| Latency p99 | > 1 second | Investigate query performance |
| Database Connections | > 90% pool | Scale database or connection pool |
| Redis Memory | > 80% | Clear cache / scale Redis |
| Disk Free | < 10% | Increase storage capacity |
| CPU Usage | > 80% sustained | Scale horizontally |
| Failed Logins | > 50/hour | Check for brute force attack |

---

## Dashboard Checklist

- [ ] Request rate (req/s)
- [ ] Error rate (%)
- [ ] Latency metrics (p50, p95, p99)
- [ ] Database metrics (connections, query time)
- [ ] Redis metrics (memory, hit rate)
- [ ] Application metrics (CPU, memory, GC)
- [ ] Top endpoints (by traffic)
- [ ] Top errors (by frequency)
- [ ] Tenant activity (orders, products)
- [ ] Authentication metrics (logins, failures)

---

## Documentation

For operational procedures, see:
- [OPERATIONS.md](OPERATIONS.md) — Daily operations
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment procedures
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) — Infrastructure setup
