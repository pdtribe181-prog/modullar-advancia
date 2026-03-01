# Production Configuration Guide

## Environment Variables Configuration

All production services are configured via environment variables. Copy `.env.example` to `.env` and configure:

### Core Services

#### Supabase (Database & Auth)

```env
SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Stripe (Payments)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
```

**Production Webhook URL:** `https://advanciapayledger.com/api/v1/stripe/webhook`

Configure this URL in Stripe Dashboard → Developers → Webhooks:

1. Add endpoint: `https://advanciapayledger.com/api/v1/stripe/webhook`
2. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.created`
   - `customer.subscription.*`
   - `invoice.*`
   - `charge.dispute.*`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Redis / Upstash (Rate Limiting)

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

The rate limiter automatically uses Upstash when configured. Falls back to in-memory if not set.

### Sentry (Error Monitoring)

```env
SENTRY_DSN=https://...@...ingest.sentry.io/...
SENTRY_ENVIRONMENT=production
```

### Resend (Email Notifications)

```env
RESEND_API_KEY=re_...
EMAIL_FROM=Advancia PayLedger <noreply@advanciapayledger.com>
```

## Admin User Setup

Run the admin creation script:

```bash
npx tsx scripts/create-admin.ts
```

Default credentials:

- **Email:** <admin@advanciapayledger.com>
- **Password:** AdvanciaAdmin2026!

⚠️ **Change password after first login!**

## VPS Deployment

### Deploy to VPS

```bash
ssh root@76.13.77.8
cd /var/www/advancia
bash scripts/deploy-vps.sh
```

### Health Check

```bash
curl https://advanciapayledger.com/api/v1/health
```

### Production URLs

- **Frontend:** <https://advanciapayledger.com>
- **API:** <https://advanciapayledger.com/api/v1>
- **Admin Console:** <https://advanciapayledger.com/admin>

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       Cloudflare / CDN                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Nginx                                │
│  - SSL termination                                          │
│  - Serves frontend static files                             │
│  - Proxies /api/v1/* to backend                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PM2 Cluster Mode                          │
│                 Node.js Express API                          │
│  - Rate limiting (Upstash Redis)                            │
│  - Error tracking (Sentry)                                  │
│  - Email notifications (Resend)                             │
│  - Payment processing (Stripe)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  - PostgreSQL database                                      │
│  - Auth (JWT tokens)                                        │
│  - Row Level Security                                       │
│  - Real-time subscriptions                                  │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring

### Sentry Dashboard

Monitor errors and performance at: <https://sentry.io>

### PM2 Monitoring

```bash
pm2 status
pm2 logs healthcare-api
pm2 monit
```

### Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```
