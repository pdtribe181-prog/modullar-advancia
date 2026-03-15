# GitHub Environments Setup

This guide describes the two deployment environments used by Advancia PayLedger and how to configure them.

---

## Environments

| Environment  | Branch    | URL                                              | Protection                      |
| ------------ | --------- | ------------------------------------------------ | ------------------------------- |
| `staging`    | `develop` | <https://api-staging.advanciapayledger.com>      | None                            |
| `production` | `main`    | <https://api.advanciapayledger.com>              | Required reviewers + wait timer |

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
| `VPS_SSH_HOST`              | Hostinger VPS IP (`76.13.77.8`)      |
| `VPS_SSH_USER`              | SSH user (e.g. `root`)               |
| `VPS_SSH_KEY`               | Private SSH key (no passphrase)      |

### Production secrets

| Secret                      | Description                          |
| --------------------------- | ------------------------------------ |
| `SUPABASE_URL`              | Production Supabase project URL      |
| `SUPABASE_ANON_KEY`         | Production Supabase anon key         |
| `SUPABASE_SERVICE_ROLE_KEY` | Production Supabase service role key |
| `STRIPE_SECRET_KEY`         | `sk_live_...` — Stripe live mode key |
| `VPS_SSH_HOST`              | Hostinger VPS IP (`76.13.77.8`)      |
| `VPS_SSH_USER`              | SSH user (e.g. `root`)               |
| `VPS_SSH_KEY`               | Private SSH key (no passphrase)      |

---

## Setting up VPS SSH Access

1. Generate a deploy key: `ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/advancia_deploy -N ""`
2. Copy public key to VPS: `ssh-copy-id -i ~/.ssh/advancia_deploy.pub root@76.13.77.8`
3. Add the **private key** as `VPS_SSH_KEY` GitHub secret
4. Ensure `/var/www/advancia` exists on the VPS and is cloned from the repo
5. Provision `/var/www/advancia-staging` separately before enabling staging deploys

---

## Workflow Trigger Summary

```text
workflow_dispatch        →  run full pipeline manually
workflow_dispatch        →  deploy-staging job runs after build and only targets the staging environment
production environment   →  documented for future/manual production deployment controls; no current ci-cd production job
```
