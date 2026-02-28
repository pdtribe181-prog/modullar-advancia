# Scaling Guide — Advancia PayLedger

> Last updated: auto-generated

## Current Architecture

```
                    ┌──────────────┐
                    │  Cloudflare  │  CDN + DDoS + WAF
                    │    (Edge)    │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │    Nginx     │  Reverse proxy + TLS termination
                    │  (VPS)      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │  PM2 #1   │ │ PM2#2 │ │  PM2 #N   │  Express.js cluster
        │  (3000)   │ │(3001) │ │  (300N)   │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
        ┌─────┴────────────┴────────────┴──────┐
        │         Supabase (PostgreSQL)         │  Managed DB
        │         + Upstash Redis               │  Managed Cache
        └──────────────────────────────────────┘
```

## Scaling Dimensions

### 1. Vertical Scaling (Scale Up)

| Component       | Current       | Next Step     | When                                |
| --------------- | ------------- | ------------- | ----------------------------------- |
| VPS             | 2 vCPU / 4 GB | 4 vCPU / 8 GB | CPU > 80% sustained                 |
| Supabase        | Pro (8 GB)    | Pro+ (16 GB)  | DB size > 6 GB or connections > 200 |
| Redis (Upstash) | Pay-as-you-go | Pro 256 MB    | Cache hit rate < 85%                |

### 2. Horizontal Scaling (Scale Out)

#### PM2 Cluster Mode

Current config (2 instances):

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'healthcare-api',
      instances: 2, // ← increase this
      exec_mode: 'cluster',
      max_memory_restart: '500M',
    },
  ],
};
```

Scale to match CPU cores:

```bash
# Scale to 4 instances
pm2 scale healthcare-api 4

# Or use 'max' for all available cores
pm2 scale healthcare-api max

# Save and persist
pm2 save
```

#### Multi-Server Scaling

When one VPS is insufficient:

1. **Provision second VPS** with identical setup
2. **Configure Nginx upstream** load balancing:

```nginx
upstream api_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server <VPS_2_IP>:3000;
    server <VPS_2_IP>:3001;
}

server {
    location /api/ {
        proxy_pass http://api_backend;
    }
}
```

3. **Shared session state**: Already handled — sessions are stateless (JWT tokens), rate limiting uses shared Redis (Upstash)

### 3. Database Scaling

#### Connection Pooling

Already configured via Supabase PgBouncer:

- Transaction mode pooling (default)
- Max ~200 connections per project (Pro plan)

#### Read Replicas (Supabase Pro+)

For read-heavy workloads:

```sql
-- Route analytics/reporting queries to read replica
-- Configure via Supabase Dashboard → Database → Read Replicas
```

#### Table Partitioning (Future)

For tables exceeding 10M rows:

```sql
-- Example: partition transactions by month
CREATE TABLE transactions_partitioned (
    LIKE transactions INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE transactions_2025_01 PARTITION OF transactions_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 4. Caching Scaling

#### Redis Cache Tiers

| Traffic        | Redis Plan         | Max Memory | Strategy        |
| -------------- | ------------------ | ---------- | --------------- |
| < 1K req/min   | Upstash Free       | 256 MB     | Cache hot paths |
| 1K-10K req/min | Upstash Pro        | 1 GB       | Cache all GETs  |
| > 10K req/min  | Upstash Enterprise | 10 GB      | Multi-region    |

#### Cache Key Strategy

Already implemented in `src/middleware/cache.middleware.ts`:

- Role-aware keys prevent data leakage
- TTL-based invalidation (60s default)
- Manual invalidation on writes

### 5. CDN / Edge Scaling

Cloudflare (already configured) handles:

- Static asset caching (frontend)
- DDoS mitigation
- Geographic distribution

For API-level edge caching:

```
Cloudflare → Cache Rules → /api/v1/public/* → Cache 5 min
```

## Scaling Triggers & Thresholds

| Metric              | Warning         | Critical        | Action                                      |
| ------------------- | --------------- | --------------- | ------------------------------------------- |
| CPU usage           | > 70% for 5 min | > 90% for 2 min | Add PM2 instances / upgrade VPS             |
| Memory usage        | > 80%           | > 95%           | Increase `max_memory_restart` / upgrade VPS |
| Response time (p95) | > 500ms         | > 2000ms        | Check DB queries, add caching               |
| DB connections      | > 150           | > 190           | Enable PgBouncer / upgrade plan             |
| Error rate          | > 1%            | > 5%            | Investigate + scale if load-related         |
| Redis memory        | > 75%           | > 90%           | Upgrade Upstash plan                        |
| Disk usage          | > 70%           | > 85%           | Clean logs / upgrade disk                   |

## Monitoring Commands

```bash
# PM2 process status
pm2 monit

# System resources
htop

# Nginx connections
ss -s

# Database connections (Supabase Dashboard or SQL)
SELECT count(*) FROM pg_stat_activity;

# Current metrics
curl -s http://localhost:3000/metrics
```

## Cost Projections

| Scale Tier | Users  | Monthly Est.                                                             |
| ---------- | ------ | ------------------------------------------------------------------------ |
| Starter    | < 500  | $40 (VPS $10 + Supabase $25 + Redis free + Cloudflare free)              |
| Growth     | 500-5K | $120 (VPS $20 + Supabase $25 + Redis $10 + Cloudflare $20 + Sentry $30)  |
| Scale      | 5K-50K | $400 (VPS $80 + Supabase $100 + Redis $50 + Cloudflare $20 + Sentry $80) |
| Enterprise | 50K+   | Custom (multi-VPS, read replicas, dedicated support)                     |
