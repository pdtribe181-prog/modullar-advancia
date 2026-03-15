# Staging Runbook (VPS + Supabase)

This runbook defines the standard process for deploying and validating the staging environment.

## Scope

- API staging host: `api-staging.advanciapayledger.com`
- Planned VPS path: `/var/www/advancia-staging` (PM2: `advancia-staging`, port 3001)
- Current status: not provisioned on the live VPS
- Database/auth backend: **Supabase staging project only**

## 1) Pre-Deploy Checklist

- [ ] `develop` branch is green in CI
- [ ] No production secrets in staging env vars
- [ ] Staging Supabase project confirmed (different project ID from production)
- [ ] Staging Stripe keys are test keys (`sk_test_...`, `pk_test_...`)
- [ ] Staging webhook secret is separate from production

## 2) Required VPS Environment Variables (`/var/www/advancia-staging/.env`)

Use values from `.env.staging.example`.

Required minimum:

- `NODE_ENV=staging`
- `PORT=3001`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY` (test)
- `STRIPE_PUBLISHABLE_KEY` (test)
- `STRIPE_WEBHOOK_SECRET` (staging endpoint secret)
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT=staging`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 3) Deploy to VPS Staging

```bash
ssh root@76.13.77.8
mkdir -p /var/www/advancia-staging
cd /var/www/advancia-staging
git clone https://github.com/pdtribe181-prog/modullar-advancia.git .
git checkout develop
npm ci --omit=dev
npm run build
pm2 start dist/server.js --name advancia-staging -- --port 3001
```

Or trigger via GitHub Actions (workflow_dispatch → staging environment).

## 4) DNS + TLS Validation

Run from terminal:

```bash
nslookup api-staging.advanciapayledger.com 8.8.8.8
curl -I https://api-staging.advanciapayledger.com/health
```

Expected:

- DNS resolves to Cloudflare-proxied IPs (or VPS IP if proxy OFF).
- HTTPS responds `200`, valid certificate chain.

If Cloudflare returns `403` for staging `/health`, toggle the `api-staging` DNS record to **DNS only** (gray cloud) in the Cloudflare dashboard.

## 5) Functional Smoke Tests

Preferred one-command check:

```powershell
./scripts/staging-smoke-check.ps1
```

Manual fallback:

```bash
curl -s https://api-staging.advanciapayledger.com/health
```

Expected JSON includes:

- `"status":"healthy"`
- database connected
- monitoring enabled

Then verify in app logs/monitoring:

- Auth flow (staging user login)
- Payment intent creation using Stripe test card
- Any critical webhook path receives and validates signatures

## 6) Data Safety Guardrails

- Never connect staging API to production Supabase project.
- Never use production Stripe live keys in staging.
- Keep staging email/SMS providers either sandboxed or clearly labeled.

## 7) Rollback (Staging)

If deploy is unhealthy:

```bash
ssh root@76.13.77.8 "cd /var/www/advancia-staging && git reset --hard HEAD~1 && npm run build && pm2 restart advancia-staging"
```

Or use `./scripts/rollback.sh staging` to find and deploy the previous tag.

## 8) Exit Criteria (Staging Ready)

- [ ] Health check is stable over HTTPS
- [ ] Core auth and payment test flow passes
- [ ] No critical errors in Sentry (`staging` environment)
- [ ] Staging and production secrets/projects are confirmed isolated
