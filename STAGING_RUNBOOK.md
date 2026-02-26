# Staging Runbook (Render + Supabase)

This runbook defines the standard process for deploying and validating the staging environment.

## Scope

- API staging host: `api-staging.advanciapayledger.com`
- Render origin: `modullar-advancia.onrender.com`
- Database/auth backend: **Supabase staging project only**

## 1) Pre-Deploy Checklist

- [ ] `main` branch is green in CI
- [ ] No production secrets in staging env vars
- [ ] Staging Supabase project confirmed (different project ID from production)
- [ ] Staging Stripe keys are test keys (`sk_test_...`, `pk_test_...`)
- [ ] Staging webhook secret is separate from production

## 2) Required Render Environment Variables

Use values from `.env.staging.example`.

Required minimum:

- `NODE_ENV=staging`
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

## 3) Deploy to Render

1. Open Render service for staging API.
2. Confirm environment variables are present and saved.
3. Trigger deploy from latest `main` commit (or approved commit SHA).
4. Wait for build/start to complete.

## 4) DNS + TLS Validation

Run from terminal:

```bash
nslookup api-staging.advanciapayledger.com 8.8.8.8
curl -I https://api-staging.advanciapayledger.com/health
```

Expected:

- DNS resolves to Cloudflare-proxied IPs (if proxy ON) or Render target.
- HTTPS responds `200` (or expected status), valid certificate chain.

If Cloudflare returns `403` for staging `/health`, choose one of the following:

### Option A: Disable Cloudflare Proxy for Staging (Recommended for Free Plan)

Staging doesn't need edge protection; bypass Cloudflare WAF/firewall:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **advanciapayledger.com**
2. Navigate to **DNS** → **Records**
3. Find `api-staging` record (CNAME pointing to Render)
4. Click **Edit** → Toggle proxy status to **DNS only** (gray cloud icon)
5. **Save**

Staging traffic now bypasses Cloudflare edge, going directly to Render origin.

### Option B: API Automation (Requires Pro Plan or Token with WAF Edit Permission)

```powershell
# Check if allow rule exists
./scripts/cloudflare-allow-staging-health.ps1 -Mode Check

# Create allow rule (requires CF_ZONE_ID + CF_API_TOKEN with WAF/firewall edit scope)
./scripts/cloudflare-allow-staging-health.ps1 -Mode Apply
```

**Note:** Free plan tokens have limited API access for WAF/firewall rules. Automation requires Cloudflare Pro plan or higher.

## 5) Functional Smoke Tests

Preferred one-command check:

```powershell
./scripts/staging-smoke-check.ps1
```

Optional override (example):

```powershell
./scripts/staging-smoke-check.ps1 -ApiBaseUrl "https://api-staging.advanciapayledger.com" -DnsName "api-staging.advanciapayledger.com"
```

Manual fallback:

Run:

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

1. Re-deploy last known good commit in Render.
2. Re-run health endpoint check.
3. Verify Supabase connectivity and env var integrity.
4. Document incident in staging notes.

## 8) Exit Criteria (Staging Ready)

- [ ] Health check is stable over HTTPS
- [ ] Core auth and payment test flow passes
- [ ] No critical errors in Sentry (`staging` environment)
- [ ] Staging and production secrets/projects are confirmed isolated
