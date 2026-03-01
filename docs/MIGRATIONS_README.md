# Database Migrations Guide

## Overview

This project uses PostgreSQL migrations to manage database schema changes. Due to Supabase REST API limitations with complex procedural SQL, migrations are organized for both manual execution and CLI-based workflows.

---

## Directory Structure

### `/migrations/` (56 files)

**Primary migration source** - Numbered format (001-056)

```text
migrations/
├── 001_extensions_and_enums.sql
├── 002_core_tables.sql
├── 003_transactions_invoices.sql
├── ...
├── 056_final_optimizations.sql
```

**Usage**: Manual execution via Supabase SQL Editor

**Why**: Supabase REST API cannot execute `DO $$ ... $$` procedural blocks, `CREATE EXTENSION`, and other PostgreSQL features. Direct SQL Editor execution bypasses these limitations.

**Status Tracking**: See [MIGRATIONS_ACTION_PLAN.md](MIGRATIONS_ACTION_PLAN.md)

---

### `/supabase/migrations/` (6 files)

**Supabase CLI format** - Timestamp-prefixed filenames

```text
supabase/migrations/
├── 20260217000015_stripe_integration.sql
├── 20260217000016_security_fixes.sql
├── 20260218000019_fix_security_definer_views.sql
├── 20260218000020_fix_security_linter_issues.sql
├── 20260218000021_wallet_integration.sql
└── 20260218000025_security_preferences.sql
```

**Usage**: Supabase CLI workflows (`supabase db push`, `supabase db reset`)

**Note**: These files duplicate critical migrations from `/migrations/` (015, 016, 019, 020, 021, 025) for teams using CLI-based development.

---

## Migration Strategy by Workflow

### Workflow 1: Manual Execution (Recommended for Production)

**When to use**:

- First-time database setup
- Production migrations
- Migrations with complex procedural code
- When REST API limitations are encountered

**Steps**:

1. Open Supabase SQL Editor: `https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql/new`
2. Navigate to migration file: `migrations/001_extensions_and_enums.sql`
3. Copy entire file content
4. Paste into SQL Editor
5. Click "Run"
6. Verify green checkmark ✅ in Results tab
7. Proceed to next migration in sequence

**Time Estimate**: 30-40 minutes for all 56 migrations

**Full Guide**: [MIGRATIONS_ACTION_PLAN.md](MIGRATIONS_ACTION_PLAN.md)

---

### Workflow 2: Supabase CLI (For CLI Users)

**When to use**:

- Local development with Supabase CLI
- Automated CI/CD pipelines
- Team collaboration via version control

**Prerequisites**:

```bash
npm install -g supabase
supabase login
supabase link --project-ref [YOUR_PROJECT_ID]
```

**Steps**:

```bash
# Apply migrations from /supabase/migrations/
supabase db push

# Or reset database and apply all migrations
supabase db reset
```

**Note**: Only 6 migrations are in Supabase CLI format. For complete setup, you may need to convert `/migrations/` files or execute them manually first.

---

## Migration Categories

### Core Setup (001-011)

- Extensions (pg_cron, uuid-ossp, pgcrypto)
- Enums (user_role, appointment_status, transaction_status, etc.)
- Core tables (user_profiles, patients, providers)
- Transactions and invoicing
- Dispute/chargeback handling
- Notifications and settings
- Audit logs and compliance
- Provider onboarding
- Webhooks and API management
- Analytics and monitoring
- Security and permissions
- Row Level Security (RLS) policies

**Status**: ✅ Typically completed during initial setup

---

### Extended Features (012-030)

- Seed data
- Function search path fixes
- Storage and file uploads
- Stripe payment integration
- Security hardening
- RLS policy refinements
- Cryptocurrency payments
- Wallet integration
- Vault encryption
- Cron job scheduling
- Additional tables (MedBeds, telemedicine)
- Email template seeds
- Performance indexes

**Status**: Apply as needed based on feature requirements

---

### Advanced Features (031-056)

- RLS recursion fixes
- Missing tables (edge cases)
- RLS policy select wrappers
- Security definer view fixes
- Additional optimizations

**Status**: Latest migrations, apply for full feature set

---

## Verification

### After Manual Execution

```bash
# Test database connection
npm run test:connection

# Run test suite
npm test

# Check for missing tables
npm run typecheck
```

### After CLI Push

```bash
# Check migration status
supabase migration list

# Verify database schema
supabase db diff
```

---

## Common Issues

### Issue 1: "Permission denied for extension"

**Solution**: Execute migration via SQL Editor (manual workflow)

### Issue 2: "Function already exists"

**Solution**: Migration was partially applied. Check migration status, may need to manually cleanup or skip.

### Issue 3: "REST API timeout"

**Solution**: Complex migration exceeded timeout. Use SQL Editor for direct execution.

### Issue 4: "Syntax error near DO"

**Solution**: Procedural blocks require SQL Editor execution, not REST API.

---

## Best Practices

### ✅ Do

- Execute migrations in numerical order (001 → 056)
- Test migrations on staging environment first
- Backup database before major migration batches
- Review migration content before execution
- Track applied migrations (use checklist in MIGRATIONS_ACTION_PLAN.md)

### ❌ Don't

- Skip migrations (dependencies may break)
- Execute migrations out of order
- Modify migration files after they're applied
- Run same migration twice (idempotency not guaranteed)
- Apply production migrations during peak traffic

---

## Creating New Migrations

### For `/migrations/` (Manual Execution)

```bash
# Create new numbered file
touch migrations/057_new_feature.sql
```

**Naming Convention**: `{number}_{description}.sql`

**Template**:

```sql
-- Migration: 057 - Description
-- Purpose: What this migration does
-- Author: Your name
-- Date: YYYY-MM-DD

-- Create new table
CREATE TABLE IF NOT EXISTS new_feature (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own records"
  ON new_feature
  FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_new_feature_user_id ON new_feature(user_id);

-- Comment
COMMENT ON TABLE new_feature IS 'Description of table purpose';
```

---

### For `/supabase/migrations/` (CLI Workflow)

```bash
# Generate timestamped migration
supabase migration new feature_name

# Edit the generated file
code supabase/migrations/[timestamp]_feature_name.sql
```

---

## Migration History

| Count | Range | Description | Status |
|-------|-------|-------------|--------|
| 11 | 001-011 | Core database setup | ✅ Applied |
| 19 | 012-030 | Extended features | ✅ Applied |
| 26 | 031-056 | Advanced features | ✅ Applied |
| **Total** | **56** | **Complete schema** | **✅ Current** |

Last Updated: March 1, 2026

---

## Support Resources

- **Supabase SQL Editor**: `https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql`
- **Migration Action Plan**: [MIGRATIONS_ACTION_PLAN.md](MIGRATIONS_ACTION_PLAN.md)
- **Database Schema**: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Quick Reference

```bash
# Count applied migrations
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;

# List applied migrations
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

# Check table count
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

# Verify RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

> **Remember**: Migrations are the source of truth for database schema. Keep them organized, version controlled, and well-documented.
