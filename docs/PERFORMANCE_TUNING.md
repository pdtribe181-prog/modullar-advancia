# Performance Tuning Guide — Advancia PayLedger

> Last updated: auto-generated

## Quick Wins Checklist

- [x] Database indexes on hot paths (migration 053)
- [x] Redis response caching (cache.middleware.ts)
- [x] PM2 cluster mode (2+ workers)
- [x] Nginx gzip compression
- [x] Cloudflare CDN for static assets
- [x] Circuit breakers on external APIs
- [ ] Connection pool tuning (see §2)
- [ ] Slow query optimization (see §3)
- [ ] Frontend bundle optimization (see §5)

---

## 1. API Response Time Optimization

### Identify Slow Endpoints

```bash
# Check current metrics
curl -s http://localhost:3000/metrics/json | jq '.endpoints | sort_by(-.latency.p95) | .[0:5]'
```

### Caching Strategy

| Endpoint Pattern  | TTL  | Reason                           |
| ----------------- | ---- | -------------------------------- |
| GET /auth/me      | 30s  | User profile rarely changes      |
| GET /provider     | 60s  | Provider data is semi-static     |
| GET /appointments | 30s  | Time-sensitive but not real-time |
| GET /transactions | 15s  | Financial data — short TTL       |
| GET /admin/stats  | 120s | Aggregate data — expensive query |

Already implemented in `src/middleware/cache.middleware.ts`. Adjust TTLs via:

```typescript
import { cacheResponse } from '../middleware/cache.middleware.js';
router.get('/', cacheResponse(60), handler); // 60 second TTL
```

### N+1 Query Prevention

Bad:

```typescript
const patients = await supabase.from('patients').select('*');
for (const p of patients) {
  const txns = await supabase.from('transactions').select('*').eq('patient_id', p.id);
}
```

Good:

```typescript
const { data } = await supabase.from('patients').select('*, transactions(*)'); // Single query with join
```

## 2. Database Performance

### Connection Pool Tuning

Supabase uses PgBouncer in transaction mode. Optimal settings:

```
# Supabase Dashboard → Database → Connection Pooling
Pool Mode: Transaction
Pool Size: 15 (default, good for most workloads)
```

For high-concurrency workloads:

```
Pool Size: 25  (if you see "too many connections" errors)
```

### Index Verification

```sql
-- Find missing indexes (unused foreign keys)
SELECT
    c.conrelid::regclass AS table_name,
    a.attname AS column_name,
    c.confrelid::regclass AS referenced_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
    AND a.attnum = ANY(i.indkey)
);

-- Find unused indexes (wasting write performance)
SELECT
    schemaname, tablename, indexname,
    idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find slow queries (Supabase Dashboard → SQL Editor)
SELECT
    query,
    calls,
    mean_exec_time::numeric(10,2) AS avg_ms,
    total_exec_time::numeric(10,2) AS total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### RLS Policy Performance

```sql
-- Check RLS policies that might be slow
SELECT
    schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Optimization tips:

- Use `auth.uid()` (indexed) instead of sub-selects where possible
- Avoid `EXISTS (SELECT ... FROM large_table)` in RLS policies
- Add indexes on columns used in RLS conditions

## 3. Slow Query Remediation

### Common Patterns & Fixes

| Pattern                       | Issue                       | Fix                      |
| ----------------------------- | --------------------------- | ------------------------ |
| `SELECT *`                    | Fetches unnecessary columns | `SELECT id, name, email` |
| Missing `LIMIT`               | Returns unbounded rows      | Add `.limit(100)`        |
| `ILIKE '%search%'`            | Full table scan             | Use `pg_trgm` GIN index  |
| Large `IN (...)`              | Poor plan                   | Use `ANY($1::uuid[])`    |
| `ORDER BY` on non-indexed col | Sort in memory              | Add index                |

### Full-Text Search Optimization

```sql
-- Already have: idx_patients_full_name_trgm (migration 053)
-- For better search performance, use websearch_to_tsquery:
SELECT * FROM patients
WHERE to_tsvector('english', full_name) @@ websearch_to_tsquery('english', 'john smith');
```

## 4. Redis / Caching Tuning

### Cache Hit Rate Monitoring

```bash
# Check Redis stats
curl -s "$UPSTASH_REDIS_REST_URL/info" -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

Target: **> 85% hit rate**

### Cache Warming

For critical endpoints that must be fast on first access:

```typescript
// Warm cache on server start
async function warmCache() {
  await fetch('http://localhost:3000/api/v1/admin/stats');
  await fetch('http://localhost:3000/api/v1/provider');
}
```

### Eviction Policy

Upstash default: `allkeys-lru` (Least Recently Used) — optimal for API caching.

## 5. Frontend Performance

### Bundle Size Targets

| Metric                 | Target   | Current Check               |
| ---------------------- | -------- | --------------------------- |
| Initial JS (gzipped)   | < 150 KB | `npm run build -- --report` |
| Total bundle (gzipped) | < 500 KB | Check Vite output           |
| First Contentful Paint | < 1.8s   | Lighthouse                  |
| Time to Interactive    | < 3.8s   | Lighthouse                  |

### Optimization Techniques

```typescript
// Already implemented: React.lazy() for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Add chunk names for better debugging
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/Dashboard'));
```

### Image Optimization

- Use WebP format for all images
- Lazy load below-the-fold images
- Set explicit `width` and `height` to prevent layout shift

## 6. Network Optimization

### Nginx Tuning

```nginx
# Already in config — verify these are active:
gzip on;
gzip_types application/json text/plain application/javascript text/css;
gzip_min_length 256;

# Connection keepalive
keepalive_timeout 65;
keepalive_requests 100;

# Buffer tuning
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

### HTTP/2

Ensure Nginx is configured with HTTP/2:

```nginx
listen 443 ssl http2;
```

## 7. PM2 Process Tuning

```javascript
// ecosystem.config.cjs — optimized
module.exports = {
  apps: [
    {
      name: 'healthcare-api',
      script: './dist/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
      },
      // Graceful restart settings
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
```

## 8. Benchmarking

### Load Test

```bash
# Use the built-in load test script
npx tsx scripts/load-test.ts

# Or use Apache Bench for quick checks
ab -n 1000 -c 50 http://localhost:3000/health

# Expected results (2-core VPS):
# - /health: > 2000 req/s
# - /api/v1/auth/me (cached): > 500 req/s
# - /api/v1/transactions: > 200 req/s
```

### Performance Budget

| Endpoint       | p50 Target | p95 Target | p99 Target |
| -------------- | ---------- | ---------- | ---------- |
| /health        | < 5ms      | < 20ms     | < 50ms     |
| GET (cached)   | < 10ms     | < 50ms     | < 100ms    |
| GET (DB query) | < 50ms     | < 200ms    | < 500ms    |
| POST (write)   | < 100ms    | < 300ms    | < 1000ms   |
| POST (payment) | < 500ms    | < 1500ms   | < 3000ms   |
