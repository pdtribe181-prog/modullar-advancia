# Network config, proxies, Upstash, Neon

Reference for network/proxy settings, Upstash Redis, and database (Supabase vs Neon).

---

## 1. Network / proxy configuration

### Express (backend)

- **Trust proxy:** `app.set('trust proxy', 1)` in `src/server.ts` so Express trusts the first hop (nginx / Cloudflare). Required for correct client IP (rate limiting, logs) and secure cookies.
- **Env:** `TRUST_PROXY=true` in production (e.g. docker-compose, VPS). Not required for the app to set `trust proxy`; the code sets it by default.
- **Config:** `src/config/production.config.ts` sets `trustProxy: true` for the production config.

### Nginx (reverse proxy)

Two nginx configs exist:

| File | Use |
|------|-----|
| **config/nginx/advancia.conf** | Single-server config: frontend root + proxy `/api/v1/` to backend; Stripe webhook at `/api/v1/stripe/webhook` → backend `/api/v1/stripe/webhook`. |
| **nginx/advancia.conf** | API-only (api.advanciapayledger.com): HTTPS, rate limits, proxy to upstream `advancia_api` (127.0.0.1:3000). Full request URI passed (no path rewrite). |

**Stripe webhook:** Backend expects path `/api/v1/stripe/webhook`. Nginx must proxy to that same path (fixed in `config/nginx/advancia.conf`; `nginx/advancia.conf` already passes full URI).

**Headers forwarded:** `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` so the app sees the original client and scheme.

### Vite dev proxy (frontend)

**frontend/vite.config.ts:**

```ts
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:3000',
  },
},
```

So in development, requests from the frontend to `/api/...` are proxied to the backend at `http://localhost:3000` (e.g. `/api/v1/health` → `http://localhost:3000/api/v1/health`). No proxy in production — the frontend uses `VITE_API_URL` (e.g. `https://api.advanciapayledger.com/api/v1`).

### Cloudflare

- Production frontend and (optionally) API sit behind Cloudflare. `trust proxy` and `X-Forwarded-*` headers ensure the app gets the real client IP and protocol.
- Scripts: `scripts/cloudflare-setup.ts` checks Cloudflare proxy (orange cloud) and related headers.

---

## 2. Upstash (Redis)

**Role:** Optional Redis for rate limiting and (optionally) response cache. If not set, the app falls back to in-memory store (single-process only).

### Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | No (optional) | Upstash Redis REST URL, e.g. `https://your-db.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | No (optional) | Upstash REST API token |

Get both from [Upstash Console](https://console.upstash.com). If either is missing, the app uses in-memory Redis (no cross-process or serverless sharing).

### Where it’s used

- **src/lib/redis.ts** — Chooses Upstash → ioredis (`REDIS_URL`) → in-memory. Exports `getRedis()`, `getUpstashRedis()`, `getRedisKind()`.
- **Rate limiting** — `src/middleware/rateLimit.middleware.ts` uses the shared Redis when available (Upstash or ioredis).
- **Cache** — `src/middleware/cache.middleware.ts` uses the same Redis for response cache; supports Upstash (SCAN) and ioredis.
- **Preflight** — `scripts/preflight-check.ts` pings Upstash at `UPSTASH_REDIS_REST_URL/ping` when vars are set.

### Selection order (redis.ts)

1. **Upstash** — if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.
2. **ioredis** — if `REDIS_URL` is set (e.g. `redis://localhost:6379`).
3. **In-memory** — otherwise (single process, no persistence).

Upstash is REST-based (no TCP from server to Redis), so it works well behind strict firewalls and on serverless.

---

## 3. Neon

**This project does not use Neon.**

- **Database:** **Supabase** (Postgres). Connection string and auth are via `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Migrations and schema are managed through Supabase (SQL / dashboard).
- **Neon** is a serverless Postgres provider. If you ever switch or add Neon, you’d set something like `DATABASE_URL` to the Neon connection string and use it for direct Postgres (e.g. `pg`) or Prisma; the current codebase does not reference Neon.

---

## 4. Summary

| Item | Status / location |
|------|-------------------|
| **Trust proxy** | ✅ `app.set('trust proxy', 1)` in server; `TRUST_PROXY` in compose. |
| **Nginx proxy** | ✅ `config/nginx/advancia.conf`, `nginx/advancia.conf`; Stripe webhook path fixed to `/api/v1/stripe/webhook`. |
| **Vite proxy** | ✅ Dev only: `/api` → `http://localhost:3000`. |
| **Upstash** | ✅ Optional Redis via `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`; rate limit + cache; fallback to ioredis or in-memory. |
| **Neon** | ❌ Not used; DB is Supabase (Postgres). |

---

## 5. Related docs

- **.env.example** — `UPSTASH_*`, `REDIS_URL`, no Neon.
- **docs/PRODUCTION_CHECKLIST.md** — Upstash secrets for production.
- **docs/STAGING_COMPLETION_RUNBOOK.md** — Optional Upstash for staging.
- **docs/SCALING_GUIDE.md** — Upstash tiers and cache sizing.
- **scripts/preflight-check.ts** — Upstash connectivity check.
