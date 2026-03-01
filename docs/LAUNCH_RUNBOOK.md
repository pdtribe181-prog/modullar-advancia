# Launch Day Runbook

**Platform**: Advancia PayLedger Healthcare Payment Platform
**Date**: ___________
**Lead**: ___________

---

## Pre-Launch (T-2 hours)

### 1. Final Code Verification

```bash
# Ensure main branch is clean and tests pass
git checkout main && git pull
npm test                              # 1,298 backend tests
cd frontend && npx vitest run         # 25 frontend tests
cd .. && npm run test:e2e             # 29 E2E tests (requires dev server)
```

### 2. Production Pre-flight

```bash
npm run preflight
```

All checks must show ✅. Fix any ❌ before proceeding.

### 3. Stripe Go-Live Validation

```bash
npm run stripe:go-live
npm run stripe:go-live -- --remote    # Requires live keys in .env
```

Confirm:
- [ ] `sk_live_` and `pk_live_` keys are set
- [ ] `STRIPE_WEBHOOK_SECRET` matches production endpoint
- [ ] Stripe account has `charges_enabled` and `payouts_enabled`
- [ ] At least 1 webhook endpoint configured

### 4. DNS & Cloudflare

```bash
npm run verify:dns
npm run cloudflare:check -- --verify
```

Confirm:
- [ ] SSL mode is Full (Strict)
- [ ] Bot Fight Mode enabled
- [ ] HSTS header present
- [ ] HTTP → HTTPS redirect working

### 5. Secrets Audit

```bash
npm run secrets:rotate
```

Confirm:
- [ ] All external secrets configured (Stripe, Supabase, Resend, Twilio, Upstash, Sentry)
- [ ] No test/development-era keys in production

---

## Deploy (T-0)

### 6. Deploy to VPS

```bash
# Dry run first
npm run deploy:vps

# Execute
npm run deploy:vps -- --apply
```

Deploy steps: git pull → npm ci → build → PM2 reload → health check

### 7. Verify Production Health

```bash
curl -s https://api.advanciapayledger.com/health | jq .
curl -s https://api.advanciapayledger.com/health?verbose=true | jq .
```

Expected: `{"status":"healthy","database":"connected","monitoring":"enabled"}`

### 8. Webhook Delivery Test

```bash
npm run stripe:webhooks -- --trigger --url https://api.advanciapayledger.com/api/v1/stripe/webhook
```

Or manually in Stripe Dashboard → Webhooks → Send test webhook.

### 9. Smoke Test Critical Flows
- [ ] User registration → email verification received
- [ ] User login → JWT issued
- [ ] Create payment intent → Stripe returns `client_secret`
- [ ] Process test payment → `payment_intent.succeeded` webhook received
- [ ] Provider onboarding → Connect account created

---

## Post-Launch (T+1 hour)

### 10. Start Monitoring

```bash
# Uptime monitor (continuous)
npm run uptime -- --watch

# Check Sentry for new errors
# https://sentry.io → advancia → Issues (last 1 hour)
```

### 11. Lighthouse Audit

```bash
npm run lighthouse
# Or use: https://pagespeed.web.dev/
```

Target: >90 on all 4 axes (Performance, Accessibility, Best Practices, SEO)

### 12. GitHub Actions Secrets

```bash
npm run secrets:setup -- --apply --env production
```

Confirm CI pipeline runs green with production secrets.

---

## Rollback Procedure

If critical issues are found post-launch:

```bash
# 1. Identify problematic commit
git log --oneline -10

# 2. Revert to last known good commit
ssh root@76.13.77.8 "cd /var/www/advancia && git checkout <COMMIT_SHA> && npm ci && npm run build && pm2 reload config/ecosystem.config.cjs --env production"

# 3. Verify health
curl -s https://api.advanciapayledger.com/health | jq .

# 4. Document the incident
```

See [docs/ROLLBACK_PROCEDURE.md](docs/ROLLBACK_PROCEDURE.md) for detailed rollback steps.

---

## Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | ___________ |
| Backend Dev | ___________ |
| Stripe Account | ___________ |
| Supabase Support | <support@supabase.io> |
| Cloudflare Support | ___________ |
| Sentry Dashboard | <https://sentry.io> |

---

## Checklist Summary

| Step | Script | Status |
|------|--------|--------|
| Tests pass | `npm test` | ☐ |
| Pre-flight green | `npm run preflight` | ☐ |
| Stripe live keys | `npm run stripe:go-live -- --remote` | ☐ |
| DNS verified | `npm run verify:dns` | ☐ |
| Cloudflare configured | `npm run cloudflare:check -- --verify` | ☐ |
| Secrets audited | `npm run secrets:rotate` | ☐ |
| Deployed to VPS | `npm run deploy:vps -- --apply` | ☐ |
| Health check green | `curl /health` | ☐ |
| Webhooks working | `npm run stripe:webhooks -- --trigger` | ☐ |
| Smoke tests pass | Manual | ☐ |
| Monitoring active | `npm run uptime -- --watch` | ☐ |
| Lighthouse >90 | `npm run lighthouse` | ☐ |
| GH secrets set | `npm run secrets:setup -- --apply` | ☐ |
