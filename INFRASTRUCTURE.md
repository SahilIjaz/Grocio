# Infrastructure Guide

Recommended infrastructure setups for Grocio deployments across different cloud providers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CDN (CloudFlare)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Load Balancer (SSL/TLS)                        │
│        (AWS ALB / Google Cloud LB / DigitalOcean LB)        │
└─────────────────────────────────────────────────────────────┘
        ↓                                    ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│   API Instances (3+)     │    │  Web Instances (2+)      │
│   Port 3000              │    │  Port 3000               │
│   ECS / Cloud Run / App  │    │  Cloud Run / App         │
│   Services               │    │  Services                │
└──────────────────────────┘    └──────────────────────────┘
        ↓                                    ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│   PostgreSQL RDS/Cloud   │    │   Redis Cluster          │
│   SQL (HA + Replicas)    │    │   (3-5 nodes)            │
│   Multi-AZ               │    │   AOF persistence        │
└──────────────────────────┘    └──────────────────────────┘
```

---

## AWS Deployment (ECS + RDS + ElastiCache)

### 1. VPC Setup

```yaml
# CloudFormation template
AWSTemplateFormatVersion: '2010-09-09'
Description: Grocio VPC Infrastructure

Resources:
  GrocioVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref GrocioVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: us-east-1a

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref GrocioVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: us-east-1b

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref GrocioVPC
      CidrBlock: 10.0.10.0/24
      AvailabilityZone: us-east-1a

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref GrocioVPC
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: us-east-1b
```

### 2. RDS PostgreSQL Setup

```yaml
  GrocioDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: grocio-db
      Engine: postgres
      EngineVersion: '16.1'
      DBInstanceClass: db.t4g.medium
      AllocatedStorage: '100'
      StorageType: gp3
      StorageEncrypted: true
      MultiAZ: true
      DBName: grocio
      MasterUsername: !Sub '{{resolve:secretsmanager:grocio-db-secret:SecretString:username}}'
      MasterUserPassword: !Sub '{{resolve:secretsmanager:grocio-db-secret:SecretString:password}}'
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 30
      PreferredBackupWindow: '02:00-03:00'
      PreferredMaintenanceWindow: 'sun:03:00-sun:04:00'
      EnableEnhancedMonitoring: true
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      EnableIAMDatabaseAuthentication: true
```

### 3. ElastiCache Redis Setup

```yaml
  GrocioCache:
    Type: AWS::ElastiCache::ReplicationGroup
    Properties:
      ReplicationGroupDescription: Grocio Redis Cache
      Engine: redis
      EngineVersion: '7.0'
      CacheNodeType: cache.t4g.medium
      NumCacheClusters: 3
      AutomaticFailoverEnabled: true
      MultiAZ: true
      AtRestEncryptionEnabled: true
      TransitEncryptionEnabled: true
      AuthToken: !Sub '{{resolve:secretsmanager:grocio-redis-secret:SecretString:password}}'
      SecurityGroupIds:
        - !Ref CacheSecurityGroup
      CacheSubnetGroupName: !Ref CacheSubnetGroup
      SnapshotRetentionLimit: 7
      SnapshotWindow: '03:00-05:00'
      LogDeliveryConfigurations:
        - DestinationType: cloudwatch-logs
          DestinationDetails:
            CloudWatchLogsDetails:
              LogGroupName: /aws/elasticache/grocio
          Enabled: true
          LogFormat: json
```

### 4. ECS Cluster Setup

```yaml
  GrocioCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: grocio
      ClusterSettings:
        - Name: containerInsights
          Value: enabled

  APITaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: grocio-api
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: '256'
      Memory: '512'
      ContainerDefinitions:
        - Name: api
          Image: 123456789.dkr.ecr.us-east-1.amazonaws.com/grocio-api:latest
          PortMappings:
            - ContainerPort: 3000
              Protocol: tcp
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: API_PREFIX
              Value: /api/v1
          Secrets:
            - Name: DATABASE_URL
              ValueFrom: arn:aws:secretsmanager:...
            - Name: JWT_PRIVATE_KEY
              ValueFrom: arn:aws:secretsmanager:...
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: /ecs/grocio-api
              awslogs-region: us-east-1
              awslogs-stream-prefix: ecs
          HealthCheck:
            Command:
              - CMD-SHELL
              - 'curl -f http://localhost:3000/health || exit 1'
            Interval: 30
            Timeout: 5
            Retries: 3
            StartPeriod: 60

  APIService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: grocio-api
      Cluster: !Ref GrocioCluster
      TaskDefinition: !Ref APITaskDefinition
      DesiredCount: 3
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          AssignPublicIp: DISABLED
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
          SecurityGroups:
            - !Ref APISecurityGroup
      LoadBalancers:
        - ContainerName: api
          ContainerPort: 3000
          TargetGroupArn: !Ref APITargetGroup
      DeploymentConfiguration:
        MaximumPercent: 200
        MinimumHealthyPercent: 100
```

### 5. Application Load Balancer

```yaml
  GrocioALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: grocio-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup

  APITargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: grocio-api-tg
      Port: 3000
      Protocol: HTTP
      TargetType: ip
      VpcId: !Ref GrocioVPC
      HealthCheckEnabled: true
      HealthCheckPath: /api/v1/health
      HealthCheckProtocol: HTTP
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
```

---

## Google Cloud Deployment (Cloud Run + Cloud SQL + Memorystore)

### 1. Cloud SQL PostgreSQL

```bash
# Create instance
gcloud sql instances create grocio-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-2-8192 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --database-flags=cloudsql_iam_authentication=on,log_statement=all,log_duration=on

# Create database
gcloud sql databases create grocio --instance=grocio-db

# Create user
gcloud sql users create grocio-user --instance=grocio-db --password

# Set backups
gcloud sql backups create \
  --instance=grocio-db

# Enable replication
gcloud sql instances clone grocio-db grocio-db-replica \
  --region=us-east1
```

### 2. Cloud Memorystore Redis

```bash
# Create Redis cluster
gcloud redis instances create grocio-cache \
  --size=2 \
  --region=us-central1 \
  --redis-version=7.0 \
  --tier=standard \
  --replica-count=1 \
  --secondary-region=us-east1

# Enable AUTH
gcloud redis instances update grocio-cache \
  --region=us-central1 \
  --update-enable-auth
```

### 3. Cloud Run Deployment

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/grocio-api

# Deploy to Cloud Run
gcloud run deploy grocio-api \
  --image gcr.io/PROJECT_ID/grocio-api:latest \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 100 \
  --set-env-vars "NODE_ENV=production,API_PREFIX=/api/v1" \
  --set-secrets "DATABASE_URL=grocio-db-url:latest,JWT_PRIVATE_KEY=jwt-private-key:latest" \
  --no-allow-unauthenticated \
  --ingress internal-and-cloud-load-balancing

# Setup Cloud Load Balancing
gcloud compute backend-services create grocio-api-backend \
  --global \
  --protocol=HTTP2 \
  --load-balancing-scheme=EXTERNAL \
  --health-checks=grocio-health-check
```

---

## DigitalOcean Deployment (App Platform)

### 1. App Platform Configuration

```yaml
# app.yaml
name: grocio
services:
  - name: api
    git:
      repo: https://github.com/grocio/grocio.git
      branch: main
    build_command: pnpm install && pnpm --filter api build
    run_command: node dist/server.js
    source_dir: apps/api
    http_port: 3000
    envs:
      - key: NODE_ENV
        value: production
    env_slug: docker
    health_check:
      http_path: /api/v1/health
      http_port: 3000
    http_routes:
      - path: /api
    autoscaling:
      max_num_replicas: 10
      min_num_replicas: 2

  - name: web
    git:
      repo: https://github.com/grocio/grocio.git
      branch: main
    build_command: pnpm install && pnpm --filter web build
    run_command: pnpm --filter web start
    source_dir: apps/web
    http_port: 3000
    envs:
      - key: NODE_ENV
        value: production
    http_routes:
      - path: /
    autoscaling:
      max_num_replicas: 5
      min_num_replicas: 2

databases:
  - name: db
    engine: PG
    version: '16'
    size: professional-m

  - name: cache
    engine: REDIS
    version: '7'
```

### 2. Deploy

```bash
# Install doctl CLI
brew install doctl

# Deploy
doctl apps create --spec app.yaml

# Monitor deployment
doctl apps get <app-id>

# View logs
doctl apps logs <app-id> --follow
```

---

## Kubernetes Deployment (Advanced)

### 1. Kubernetes Manifests

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grocio-api
  labels:
    app: grocio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grocio-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: grocio-api
    spec:
      containers:
      - name: api
        image: myregistry.azurecr.io/grocio-api:latest
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: grocio-secrets
              key: database-url
        - name: REDIS_HOST
          value: grocio-redis
        - name: REDIS_PORT
          value: '6379'
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
```

### 2. Helm Chart

```yaml
# Chart.yaml
apiVersion: v2
name: grocio
description: Multi-tenant Grocery Management System
type: application
version: 1.0.0
appVersion: 1.0.0

# values.yaml
replicaCount: 3
image:
  repository: myregistry.azurecr.io/grocio-api
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.grocio.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: grocio-tls
      hosts:
        - api.grocio.com
```

---

## Monitoring & Logging Stack

### 1. Prometheus + Grafana

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'grocio-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 2. ELK Stack (Elasticsearch + Logstash + Kibana)

```yaml
# logstash.conf
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  mutate {
    add_field => { "[@metadata][index_name]" => "grocio-%{+YYYY.MM.dd}" }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index_name]}"
  }
}
```

### 3. Sentry for Error Tracking

```bash
# Docker setup
docker run -d --name sentry-redis redis
docker run -d --name sentry-postgres \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

docker run -d --name sentry \
  -e SENTRY_SECRET_KEY='your-secret-key' \
  -e SENTRY_POSTGRES_HOST=sentry-postgres \
  -e SENTRY_REDIS_HOST=sentry-redis \
  -p 9000:9000 \
  sentry
```

---

## SSL/TLS & Security

### 1. Let's Encrypt Certificates

```bash
# Using Certbot
sudo certbot certonly --standalone \
  -d api.grocio.com \
  -d app.grocio.com

# Using AWS ACM
aws acm request-certificate \
  --domain-name api.grocio.com \
  --domain-name app.grocio.com \
  --validation-method DNS
```

### 2. WAF Rules (AWS WAF)

```yaml
Rules:
  - Name: RateLimitRule
    Priority: 1
    Action:
      Block: {}
    Statement:
      RateBasedStatement:
        Limit: 2000
        AggregateKeyType: IP
  
  - Name: SQLiRule
    Priority: 2
    Action:
      Block: {}
    Statement:
      ManagedRuleGroupStatement:
        VendorName: AWS
        Name: AWSManagedRulesSQLiRuleSet
  
  - Name: XSSRule
    Priority: 3
    Action:
      Block: {}
    Statement:
      ManagedRuleGroupStatement:
        VendorName: AWS
        Name: AWSManagedRulesKnownBadInputsRuleSet
```

---

## Disaster Recovery

### 1. Backup Strategy

```bash
# Automated backups
- PostgreSQL: 30-day retention, daily snapshots
- Redis: 7-day retention
- Application code: Git repository
- Container images: Docker registry with versioning

# Recovery Time Objective (RTO): 1 hour
# Recovery Point Objective (RPO): 15 minutes
```

### 2. Failover Setup

```yaml
# Multi-region failover
Primary:
  Region: us-east-1
  Database: RDS primary
  Cache: ElastiCache primary
  
Secondary:
  Region: us-west-2
  Database: RDS read replica (promotion capable)
  Cache: ElastiCache replica
  
Failover Trigger:
  - Primary region unavailable
  - RTO: Promote read replica (< 5 min)
```

---

## Cost Optimization

### 1. Compute

```
- Use spot instances for non-critical workloads
- Auto-scaling: min 2, max 10 instances
- Right-size instances based on metrics
- Reserved capacity for baseline load
```

### 2. Database

```
- Use read replicas for read-heavy workloads
- Enable automated backups (cheaper than manual)
- Use smaller instance for development
- Archive old audit logs to S3
```

### 3. Storage

```
- Use S3 intelligent-tiering for logs
- Enable compression on backups
- Delete old container images
- Clean up unused volumes
```

---

## Contact & Support

Refer to [DEPLOYMENT.md](DEPLOYMENT.md) and [OPERATIONS.md](OPERATIONS.md) for detailed procedures.
