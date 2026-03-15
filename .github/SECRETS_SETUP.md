# Secrets Setup Guide

All secrets are stored in GitHub. Go to **Settings → Secrets and variables → Actions**.

---

## Repository Secrets (shared across all environments)

These are used by CI jobs that don't require environment-specific credentials.

| Secret          | Where to get it                                | Required |
| --------------- | ---------------------------------------------- | -------- |
| `CODECOV_TOKEN` | [codecov.io](https://codecov.io) repo settings | Optional |

---

## Staging Environment Secrets

Go to **Settings → Environments → staging → Add secret**:

| Secret                           | Description                     | Example format                      |
| -------------------------------- | ------------------------------- | ----------------------------------- |
| `SUPABASE_URL`              | Supabase project URL            | `https://xxxx.supabase.co`          |
| `SUPABASE_ANON_KEY`         | Public anon key                 | `eyJhbGci...`                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, keep private! | `eyJhbGci...`                       |
| `STRIPE_SECRET_KEY`         | Stripe **test** secret key      | `sk_test_51...`                     |
| `STRIPE_PUBLISHABLE_KEY`    | Stripe **test** publishable key | `pk_test_51...`                     |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signing secret   | `whsec_...`                         |
| `VPS_SSH_HOST`              | Hostinger VPS IP/hostname       | `76.13.77.8`                        |
| `VPS_SSH_USER`              | SSH login user on VPS           | `root`                              |
| `VPS_SSH_KEY`               | Private SSH key (no passphrase) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `JWT_SECRET`                | Min 32-char random string       | `openssl rand -hex 32`              |
| `RESEND_API_KEY`            | Resend email API key            | `re_...`                            |

---

## Production Environment Secrets

Go to **Settings → Environments → production → Add secret**:

| Secret                      | Description                                         | Example format                             |
| --------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `SUPABASE_URL`              | Production Supabase URL                             | `https://pikguczsvikzragmrojz.supabase.co` |
| `SUPABASE_ANON_KEY`         | Production anon key                                 | `eyJhbGci...`                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key                         | `eyJhbGci...`                              |
| `STRIPE_SECRET_KEY`         | Stripe **live** secret key                          | `sk_live_51...`                            |
| `STRIPE_PUBLISHABLE_KEY`    | Stripe **live** publishable key                     | `pk_live_51...`                            |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signing secret                       | `whsec_...`                                |
| `VPS_SSH_HOST`              | Hostinger VPS IP/hostname                           | `76.13.77.8`                               |
| `VPS_SSH_USER`              | SSH login user on VPS                               | `root`                                     |
| `VPS_SSH_KEY`               | Private SSH key (no passphrase)                     | `-----BEGIN OPENSSH PRIVATE KEY-----...`   |
| `JWT_SECRET`                | Min 32-char random string (different from staging!) | `openssl rand -hex 32`                     |
| `RESEND_API_KEY`            | Resend email API key                                | `re_...`                                   |
| `SENTRY_DSN`                | Sentry error tracking DSN                           | `https://xxx@yyy.ingest.sentry.io/zzz`     |
| `TWILIO_ACCOUNT_SID`        | Twilio SMS account SID                              | `ACxxxx`                                   |
| `TWILIO_AUTH_TOKEN`         | Twilio auth token                                   | `...`                                      |
| `TWILIO_PHONE_NUMBER`       | Twilio phone number                                 | `+1234567890`                              |

---

## Generating Secrets Locally

```bash
# JWT secret (32 bytes = 64 hex chars)
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Adding Secrets via GitHub CLI

```bash
# Set a repository secret
gh secret set CODECOV_TOKEN --body "your-token-here"

# Set VPS SSH secrets
gh secret set VPS_SSH_HOST --env production --body "76.13.77.8"
gh secret set VPS_SSH_USER --env production --body "root"
gh secret set VPS_SSH_KEY  --env production --body "$(cat ~/.ssh/id_rsa)"

# List all secrets (names only, values are masked)
gh secret list
gh secret list --env production
```

---

## Secrets in Local Development

Create a `.env` file (gitignored):

```bash
cp .env.example .env
# Fill in your values — never commit this file!
```

Required local variables are documented in `.env.example`.

---

## Security Notes

- ⚠️ Never log or print secret values in workflow steps
- ⚠️ Use test keys (`sk_test_`, `pk_test_`) everywhere except production environment
- ⚠️ Rotate `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` if they are ever exposed
- ✅ Staging and production should have **different** secrets — never share live keys
