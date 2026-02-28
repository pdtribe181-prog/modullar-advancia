# Rollback Procedure — Advancia PayLedger

> Last updated: auto-generated

## Quick Reference

| Step                    | Command                                                                                      | When                              |
| ----------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| Identify the bad deploy | `pm2 logs --lines 200`                                                                       | Immediately after detecting issue |
| Rollback backend        | `git checkout <last-good-sha> && npm ci && npm run build && pm2 reload ecosystem.config.cjs` | < 5 min                           |
| Rollback frontend       | Revert Cloudflare Pages deployment from dashboard                                            | < 2 min                           |
| Rollback database       | Supabase PITR (point-in-time recovery)                                                       | 5–30 min                          |

---

## 1. Pre-Rollback Decision Tree

```
Is the service fully down?
  YES → Go to §2 (Emergency rollback)
  NO  → Is the error impacting payments?
          YES → Go to §2 (Emergency rollback)
          NO  → Is the error rate > 5%?
                  YES → Go to §3 (Standard rollback)
                  NO  → Hotfix in place (§4)
```

## 2. Emergency Backend Rollback

```bash
# 1. SSH into VPS
ssh root@76.13.77.8

# 2. Find the last known-good commit
cd /root/modullar-advancia
git log --oneline -10

# 3. Checkout the good commit
git checkout <GOOD_SHA>

# 4. Reinstall dependencies (lock-file only)
npm ci

# 5. Rebuild
npm run build

# 6. Reload PM2 (zero-downtime)
pm2 reload ecosystem.config.cjs

# 7. Verify
curl -s http://localhost:3000/health | jq .status
# Should output: "healthy"
```

### Timing

- Steps 1-6: **~2 minutes**
- DNS/CDN cache may add 30-60s propagation

## 3. Standard Rollback (Non-Emergency)

```bash
# 1. Tag the bad release for post-mortem
git tag -a broken-v<VERSION> -m "Broken release — rolled back"
git push origin broken-v<VERSION>

# 2. Revert the merge commit on main
git revert -m 1 <MERGE_COMMIT_SHA>
git push origin main

# 3. CI/CD will automatically deploy the revert
# OR manually:
ssh root@76.13.77.8
cd /root/modullar-advancia && git pull && npm ci && npm run build && pm2 reload ecosystem.config.cjs
```

## 4. Database Rollback

### Option A: Supabase Point-in-Time Recovery (Pro plan)

1. Open **Supabase Dashboard** → project → **Database** → **Backups**
2. Select **Point in Time** tab
3. Choose a timestamp **before** the bad migration ran
4. Click **Restore** — confirms by typing project name
5. Wait 5-30 minutes for restoration
6. **Re-apply any safe migrations** that ran after the restore point

### Option B: Manual SQL Revert

If the migration is additive (new tables/columns only):

```sql
-- Example: drop a table added by a bad migration
DROP TABLE IF EXISTS bad_new_table CASCADE;

-- Example: remove a column
ALTER TABLE existing_table DROP COLUMN IF EXISTS bad_column;
```

### Option C: Seed Data Revert

```bash
# Re-run seed migration
npx tsx scripts/run-migration-rest.ts migrations/012_seed_data.sql
```

## 5. Frontend Rollback

### Cloudflare Pages

1. Go to **Cloudflare Dashboard** → Pages → `advanciapayledger` project
2. Click **Deployments**
3. Find the last good deployment → click **⋯** → **Rollback to this deploy**

### Manual Build

```bash
cd frontend
git checkout <GOOD_SHA>
npm ci && npm run build
# Upload dist/ to hosting
```

## 6. Stripe Webhook Rollback

If webhook endpoint URL changed:

1. Go to **Stripe Dashboard** → Developers → Webhooks
2. Update endpoint URL back to the previous value
3. Test with `stripe trigger payment_intent.succeeded`

## 7. Post-Rollback Checklist

- [ ] Verify `/health` returns 200
- [ ] Verify `/metrics` shows no elevated error rate
- [ ] Check Sentry for new errors
- [ ] Notify the team via Slack/email
- [ ] Schedule post-mortem within 24 hours
- [ ] Document the root cause in an incident report
- [ ] Create a fix PR and test in staging before re-deploying
