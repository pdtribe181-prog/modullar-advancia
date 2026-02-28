# Backup & Restoration Procedure — Advancia PayLedger

> Last updated: auto-generated

## Backup Strategy Overview

| Component              | Method                         | Frequency  | Retention         |
| ---------------------- | ------------------------------ | ---------- | ----------------- |
| PostgreSQL (Supabase)  | Automated daily + PITR         | Continuous | 7 days (Pro plan) |
| Application Code       | Git (GitHub)                   | Every push | Indefinite        |
| Environment Secrets    | Password manager vault         | On change  | Indefinite        |
| File Uploads (Storage) | Supabase Storage (S3-backed)   | Automatic  | Indefinite        |
| Redis (Upstash)        | Upstash automated              | Daily      | 7 days            |
| PM2 Configuration      | `ecosystem.config.cjs` in repo | Every push | Indefinite        |

---

## 1. Database Backup

### Automatic Backups (Supabase Pro)

- Supabase performs daily automated backups
- Point-in-time recovery (PITR) captures WAL logs continuously
- Retention: 7 days on Pro plan

### Manual Database Export

```bash
# Via Supabase CLI (recommended)
npx supabase db dump --db-url "$DATABASE_URL" -f backup_$(date +%Y%m%d).sql

# Via pg_dump (if direct access)
pg_dump "$DATABASE_URL" --no-owner --no-acl -f backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Export Specific Tables

```bash
# Export only transaction-related tables
pg_dump "$DATABASE_URL" --no-owner \
  -t transactions -t invoices -t disputes -t refunds \
  -f transactions_backup_$(date +%Y%m%d).sql
```

## 2. Database Restoration

### Option A: Supabase PITR (Fastest)

1. **Dashboard** → Project → Database → Backups → Point in Time
2. Select timestamp (before the issue occurred)
3. Type project name to confirm → **Restore**
4. Wait 5-30 minutes
5. Verify data integrity:

```sql
-- Check row counts on critical tables
SELECT 'user_profiles' AS tbl, count(*) FROM user_profiles
UNION ALL SELECT 'transactions', count(*) FROM transactions
UNION ALL SELECT 'patients', count(*) FROM patients
UNION ALL SELECT 'providers', count(*) FROM providers;
```

### Option B: Manual SQL Restore

```bash
# Restore from a .sql dump
psql "$DATABASE_URL" -f backup_20250101.sql

# Restore from gzipped dump
gunzip -c backup_20250101.sql.gz | psql "$DATABASE_URL"
```

### Option C: Selective Table Restore

```bash
# Restore only specific tables from a full dump
pg_restore -d "$DATABASE_URL" --no-owner -t transactions backup.dump
```

## 3. Application Code Backup

Code is continuously backed up via Git:

```bash
# Clone full repo (all history)
git clone https://github.com/pdtribe181-prog/modullar-advancia.git

# Create a tagged backup before risky deploys
git tag -a backup-pre-deploy-$(date +%Y%m%d) -m "Pre-deploy backup"
git push origin --tags
```

## 4. Environment Variables Backup

### Export Current Environment

```bash
# On VPS — export current .env (sanitised)
ssh root@76.13.77.8 'cat /root/modullar-advancia/.env' > env_backup_$(date +%Y%m%d).enc

# Encrypt the backup
gpg --symmetric --cipher-algo AES256 env_backup_$(date +%Y%m%d).enc
```

### Restoration

```bash
gpg --decrypt env_backup_20250101.enc > .env
# Then restart PM2
pm2 reload ecosystem.config.cjs
```

## 5. File Uploads (Supabase Storage)

Supabase Storage is backed by S3 and is automatically redundant. For manual backup:

```bash
# List all buckets
npx supabase storage ls

# Download all files from a bucket
npx supabase storage cp -r supabase://medical-documents ./backup/medical-documents
npx supabase storage cp -r supabase://insurance-documents ./backup/insurance-documents
npx supabase storage cp -r supabase://profile-avatars ./backup/profile-avatars
```

## 6. Redis Backup

Upstash Redis provides automated snapshots. For manual export:

```bash
# Export Redis data via CLI
redis-cli -u "$UPSTASH_REDIS_REST_URL" --rdb backup_redis_$(date +%Y%m%d).rdb
```

## 7. Disaster Recovery Runbook

### Complete System Recovery (worst case)

1. **Provision new VPS** (Hostinger or alternative)
2. **Clone repository**: `git clone https://github.com/pdtribe181-prog/modullar-advancia.git`
3. **Restore .env** from encrypted backup
4. **Install dependencies**: `npm ci`
5. **Build**: `npm run build`
6. **Restore database** from Supabase PITR or SQL dump
7. **Start application**: `pm2 start ecosystem.config.cjs`
8. **Update DNS** to point to new VPS IP
9. **Verify**: `curl https://api.advanciapayledger.com/health`
10. **Re-configure Stripe webhook** URL if domain changed

### Recovery Time Objectives

| Scenario          | RTO                        | RPO            |
| ----------------- | -------------------------- | -------------- |
| Application crash | < 1 min (PM2 auto-restart) | 0              |
| Bad deployment    | < 5 min (rollback)         | 0              |
| VPS failure       | < 30 min                   | < 5 min (PITR) |
| Data corruption   | < 1 hour                   | < 5 min (PITR) |
| Full disaster     | < 4 hours                  | < 24 hours     |

## 8. Backup Verification Schedule

| Task                          | Frequency | Owner    |
| ----------------------------- | --------- | -------- |
| Verify Supabase backup exists | Weekly    | DevOps   |
| Test PITR restore (staging)   | Monthly   | DevOps   |
| Rotate encrypted env backup   | On change | Security |
| Verify Git tag history        | Monthly   | Lead Dev |
| Test full disaster recovery   | Quarterly | Team     |
