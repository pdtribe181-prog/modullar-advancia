# Advancia PayLedger — Deployment Runbook

## Quick Reference

| Item         | Value                                       |
| ------------ | ------------------------------------------- |
| VPS IP       | `76.13.77.8`                                |
| SSH Alias    | `advancia-vps`                              |
| SSH User     | `advancia` (sudo)                           |
| App Path     | `/var/www/advancia`                         |
| PM2 Process  | `advancia-api`                              |
| API URL      | `https://api.advanciapayledger.com/api/v1`  |
| Frontend     | Cloudflare Pages (auto-deploys from `main`) |
| Database     | Supabase (`pikguczsvikzragmrojz`)           |
| Health Check | `https://api.advanciapayledger.com/health`  |
| Swagger Docs | `https://api.advanciapayledger.com/docs/`   |

---

## 1. Standard Deployment

### Backend (VPS)

```bash
# From local machine — one-liner deploy
ssh advancia-vps 'cd /var/www/advancia && git pull origin main && npm ci --production && npm run build && pm2 reload advancia-api'
```

### Frontend (Cloudflare Pages)

Cloudflare Pages auto-deploys when `main` is pushed. No manual action needed.

```bash
git push origin main  # triggers Cloudflare Pages build
```

### Verify Deployment

```bash
# Check API health
curl -s https://api.advanciapayledger.com/health | jq .

# Check PM2 status
ssh advancia-vps 'pm2 status'

# Check recent logs
ssh advancia-vps 'pm2 logs advancia-api --lines 20 --nostream'
```

---

## 2. Database Migrations

### Run Migration via Supabase SQL Editor

1. Go to <https://supabase.com/dashboard> → SQL Editor
2. Copy-paste the migration SQL file
3. Run and verify output

### Run Migration via CLI

```bash
ssh advancia-vps 'cd /var/www/advancia && npx tsx scripts/run-migration-rest.ts migrations/XXX_migration_name.sql'
```

### Rollback

Migrations do not have automatic rollback. For critical issues:

1. Restore from the latest daily backup (retained 7 days)
2. Backup location on VPS: `/var/backups/advancia/`
3. Manual restore: `psql $DATABASE_URL < /var/backups/advancia/advancia-YYYY-MM-DD.sql.gz`

---

## 3. Rollback Procedures

### Rollback to Previous Commit

```bash
# Find the previous good commit
git log --oneline -10

# Deploy the specific commit
ssh advancia-vps 'cd /var/www/advancia && git checkout <COMMIT_HASH> && npm ci --production && npm run build && pm2 reload advancia-api'

# Return to main after investigation
ssh advancia-vps 'cd /var/www/advancia && git checkout main'
```

### Emergency: Restart Without Redeploying

```bash
ssh advancia-vps 'pm2 restart advancia-api'
```

### Emergency: Stop All Traffic

```bash
ssh advancia-vps 'pm2 stop advancia-api'
# Re-enable:
ssh advancia-vps 'pm2 start advancia-api'
```

---

## 4. Monitoring & Logs

### PM2 Logs

```bash
# Live stream
ssh advancia-vps 'pm2 logs advancia-api'

# Last 100 lines (no stream)
ssh advancia-vps 'pm2 logs advancia-api --lines 100 --nostream'

# Error logs only
ssh advancia-vps 'pm2 logs advancia-api --err --lines 50 --nostream'
```

### Log Files

| Log           | Location                                          |
| ------------- | ------------------------------------------------- |
| PM2 stdout    | `/home/advancia/.pm2/logs/advancia-api-out.log`   |
| PM2 stderr    | `/home/advancia/.pm2/logs/advancia-api-error.log` |
| Nginx access  | `/var/log/nginx/access.log`                       |
| Nginx error   | `/var/log/nginx/error.log`                        |
| PM2 logrotate | 10MB max, 7-day retention, compressed             |

### Sentry

- Dashboard: <https://sentry.io> (check project `modullar-advancia`)
- Alerts are configured for error spikes

### Health Check Cron

A cron job runs every 5 minutes to check API health and auto-restart PM2 if down:

- Script: `/usr/local/bin/advancia-healthcheck.sh`
- Logs: `/var/log/advancia-healthcheck.log`

---

## 5. Incident Response

### Severity Levels

| Level         | Description                          | Response Time     |
| ------------- | ------------------------------------ | ----------------- |
| P1 - Critical | API fully down, payments broken      | Immediate         |
| P2 - High     | Degraded performance, partial outage | < 1 hour          |
| P3 - Medium   | Non-critical feature broken          | < 4 hours         |
| P4 - Low      | Cosmetic / minor bug                 | Next business day |

### P1 — API Down

1. **Verify**: `curl -s https://api.advanciapayledger.com/health`
2. **Check PM2**: `ssh advancia-vps 'pm2 status'`
3. **Restart**: `ssh advancia-vps 'pm2 restart advancia-api'`
4. **Check logs**: `ssh advancia-vps 'pm2 logs advancia-api --err --lines 50 --nostream'`
5. **Check disk**: `ssh advancia-vps 'df -h'`
6. **Check memory**: `ssh advancia-vps 'free -m'`
7. **If VPS unreachable**: Contact Hostinger support or reboot from Hostinger dashboard

### P1 — Payment Processing Failure

1. **Check Stripe status**: <https://status.stripe.com>
2. **Check webhook delivery**: Stripe Dashboard → Developers → Webhooks
3. **Check API logs for Stripe errors**: `ssh advancia-vps 'pm2 logs advancia-api --lines 100 --nostream | grep -i stripe'`
4. **Verify Stripe key alignment**: `ssh advancia-vps 'grep STRIPE .env'`

### P1 — Database Unreachable

1. **Check Supabase status**: <https://status.supabase.com>
2. **Check health endpoint**: `curl -s https://api.advanciapayledger.com/health | jq .checks.supabase`
3. **Verify connection string**: `ssh advancia-vps 'grep SUPABASE_URL .env'`
4. **Check Supabase dashboard**: <https://supabase.com/dashboard>

---

## 6. Scheduled Maintenance

### Daily (Automated)

| Time (Server) | Task                        | Script                                   |
| ------------- | --------------------------- | ---------------------------------------- |
| 2:00 AM       | Database backup (pg_dump)   | `/usr/local/bin/advancia-backup.sh`      |
| 3:00 AM       | SSL cert renewal check      | Certbot cron                             |
| Every 5 min   | Health check + auto-restart | `/usr/local/bin/advancia-healthcheck.sh` |

### Weekly (Manual)

- Review Sentry error trends
- Check disk space: `ssh advancia-vps 'df -h'`
- Review PM2 metrics: `ssh advancia-vps 'pm2 monit'`

### Monthly

- Review and rotate API keys/secrets
- Check for Node.js security updates
- Review Supabase usage/limits
- Run `npm audit` locally and fix vulnerabilities

---

## 7. Environment Variables

All env vars are documented in:

- Backend: `.env.example` (root)
- Frontend: `frontend/.env.example`
- Zod validation: `src/config/env.ts` (validates at startup)

### Updating Env Vars on VPS

```bash
# Edit directly
ssh advancia-vps 'nano /var/www/advancia/.env'

# Then restart
ssh advancia-vps 'pm2 reload advancia-api'
```

### Updating Env Vars on Cloudflare Pages

1. Cloudflare Dashboard → Pages → Your project → Settings → Environment variables
2. Add/update the variable
3. Trigger a new deployment (push to `main` or manual redeploy)

---

## 8. Backups

### Database (Automated)

- **Daily pg_dump** at 2:00 AM server time
- **Location**: `/var/backups/advancia/`
- **Retention**: 7 days (older files auto-deleted)
- **Format**: `advancia-YYYY-MM-DD.sql.gz` (compressed)

### Code

- Git repository: `pdtribe181-prog/modullar-advancia` on GitHub
- All code changes go through `main` branch

### Restore from Backup

```bash
# List available backups
ssh advancia-vps 'ls -la /var/backups/advancia/'

# Restore (CAUTION: this replaces the current database)
ssh advancia-vps 'gunzip -c /var/backups/advancia/advancia-YYYY-MM-DD.sql.gz | psql $DATABASE_URL'
```

---

## 9. Security

### VPS Access

- SSH key-only authentication (password auth disabled)
- Non-root user `advancia` with sudo privileges
- Fail2ban active (3 jails: sshd, nginx-http-auth, nginx-limit-req)
- UFW firewall: ports 22, 80, 443, 4000
- Automatic security updates (unattended-upgrades)

### Application Security

- Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
- CORS whitelist
- CSRF protection
- Rate limiting per endpoint category
- Input validation with Zod schemas
- RLS on all database tables
- Error messages sanitized in production (no stack traces or DB details)

### Stripe

- Webhook signature verification on all incoming events
- Test key in staging/dev, live key in production
- 34 event types subscribed

---

## 10. Contacts

| Role           | Contact                      |
| -------------- | ---------------------------- |
| VPS Provider   | Hostinger Support            |
| Database       | Supabase Dashboard / Support |
| Payments       | Stripe Dashboard / Support   |
| DNS/CDN        | Cloudflare Dashboard         |
| Error Tracking | Sentry Dashboard             |
| Email          | Resend Dashboard             |
