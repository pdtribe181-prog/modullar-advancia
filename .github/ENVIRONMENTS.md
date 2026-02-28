# GitHub Environments Setup

This guide describes the two deployment environments used by Advancia PayLedger and how to configure them.

---

## Environments

| Environment  | Branch    | URL                                              | Protection                      |
| ------------ | --------- | ------------------------------------------------ | ------------------------------- |
| `staging`    | `develop` | <https://modullar-advancia-staging.onrender.com> | None                            |
| `production` | `main`    | <https://modullar-advancia.onrender.com>         | Required reviewers + wait timer |

---

## Creating Environments in GitHub

Go to **Settings → Environments → New environment**:

### `staging`

- **Name**: `staging`
- **Deployment branches**: `develop`
- No protection rules required — staging deploys automatically

### `production`

- **Name**: `production`
- **Deployment branches**: `main`, `v*.*.*` tags
- **Protection rules**:
  - ✅ Required reviewers: `pdtribe181-prog`
  - ✅ Wait timer: 5 minutes (allows emergency cancellation)
  - ✅ Prevent self-review (if team > 1)

---

## Environment Secrets

Each environment can hold its own set of secrets, overriding repository-level secrets.

### Staging secrets

| Secret                           | Description                          |
| -------------------------------- | ------------------------------------ |
| `SUPABASE_URL`                   | Staging Supabase project URL         |
| `SUPABASE_ANON_KEY`              | Staging Supabase anon key            |
| `SUPABASE_SERVICE_ROLE_KEY`      | Staging Supabase service role key    |
| `STRIPE_SECRET_KEY`              | `sk_test_...` — Stripe test mode key |
| `RENDER_STAGING_DEPLOY_HOOK_URL` | Render deploy hook for staging       |

### Production secrets

| Secret                      | Description                          |
| --------------------------- | ------------------------------------ |
| `SUPABASE_URL`              | Production Supabase project URL      |
| `SUPABASE_ANON_KEY`         | Production Supabase anon key         |
| `SUPABASE_SERVICE_ROLE_KEY` | Production Supabase service role key |
| `STRIPE_SECRET_KEY`         | `sk_live_...` — Stripe live mode key |
| `RENDER_DEPLOY_HOOK_URL`    | Render deploy hook for production    |

---

## Getting a Render Deploy Hook

1. Go to **Render Dashboard → Your service → Settings → Deploy Hooks**
2. Click **Add Deploy Hook**
3. Name it `GitHub Actions` and copy the URL
4. Add it as a GitHub secret (`RENDER_DEPLOY_HOOK_URL` for production, `RENDER_STAGING_DEPLOY_HOOK_URL` for staging)

---

## Workflow Trigger Summary

```text
git push origin develop  →  deploy-staging   (automatic)
git push origin main     →  deploy-production (with approval gate)
workflow_dispatch        →  choose environment manually
```
