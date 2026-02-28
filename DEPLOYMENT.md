# Advancia PayLedger — Deployment Guide

## Architecture (VPS - Hostinger)

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Cloudflare     │────▶│    Hostinger VPS     │────▶│    Supabase     │
│   (DNS / SSL)   │     │  (Ubuntu 22.04)      │     │  (PostgreSQL)   │
│                 │     │  Nginx + Node + PM2  │     │   Auth + RLS    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │   Stripe    │
                        │  Payments   │
                        └─────────────┘
```

---

## Live URLs

| Service  | URL                                        | Status       |
| -------- | ------------------------------------------ | ------------ |
| App      | <https://advanciapayledger.com>            | ⏳ Pending   |
| API      | <https://api.advanciapayledger.com/api/v1> | ⏳ Pending   |
| Database | <https://pikguczsvikzragmrojz.supabase.co> | ✅ Connected |

---

## 1. VPS Backend Deploy (IP: 76.13.77.8)

### Quick Deploy (recommended)

1. SSH into the server:

   ```bash
   ssh advancia-vps
   # or: ssh advancia@76.13.77.8
   ```

2. Paste-run the full contents of `5-VPS-DEPLOY.sh`.

3. Upload backend env (from your local machine):

   ```bash
   scp 1-PAYLEDGER-BACKEND.env advancia@76.13.77.8:/var/www/advancia/.env
   ```

4. Reload and check logs:

   ```bash
   pm2 reload ecosystem.config.cjs --env production
   pm2 logs advancia-api
   ```

### DNS + SSL

In Cloudflare → **advanciapayledger.com** → DNS:

```text
Type: A
Name: api
IPv4: 76.13.77.8
Proxy: OFF (grey cloud)
```

Then on the VPS:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d api.advanciapayledger.com
```

Test:

```bash
curl https://api.advanciapayledger.com/health
```

### Manual Setup (if you’re not using the script)

1. SSH into the server: `ssh root@76.13.77.8`
2. Update system: `apt update && apt upgrade -y`
3. Install essentials:

   ```bash
   apt install -y curl git nginx ufw build-essential
   ```

4. Install Node.js 20:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   npm install -g pm2
   ```

### Phase 2: Firewall & Security

1. Configure UFW:

   ```bash
   ufw allow OpenSSH
   ufw allow 'Nginx Full'
   ufw enable
   ```

### Phase 3: Application Setup

1. Create directory:

   ```bash
   mkdir -p /var/www/advancia
   chown -R $USER:$USER /var/www/advancia
   ```

2. Clone repo:

   ```bash
   git clone https://github.com/pdtribe181-prog/modullar-advancia.git /var/www/advancia
   ```

3. Set environment variables in `/var/www/advancia/.env` (see `1-PAYLEDGER-BACKEND.env`).

### Phase 4: Nginx Configuration

1. Copy local config to server (API subdomain):

   ```bash
   # From local machine
   scp nginx/advancia.conf root@76.13.77.8:/etc/nginx/sites-available/advancia
   ```

2. Enable site:

   ```bash
   # On server
   ln -s /etc/nginx/sites-available/advancia /etc/nginx/sites-enabled/
   rm /etc/nginx/sites-enabled/default
   nginx -t
   systemctl restart nginx
   ```

---

## 2. Frontend (Cloudflare Pages)

Go to: **Cloudflare Pages → your project → Settings → Environment variables**

Add the variables from `2-PAYLEDGER-FRONTEND.env`.

### Environment Variables (Cloudflare Pages)

```env
VITE_API_URL=https://api.advanciapayledger.com/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 4. Stripe Webhook Configuration

### Development (Local)

```bash
stripe listen --forward-to localhost:3000/stripe/webhook
```

### Production

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.advanciapayledger.com/api/v1/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated` (Connect)

---

## 5. Local Development

### Start Backend

```bash
npm run dev
# → http://localhost:3000
```

### Start Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## 6. Testing

```bash
# Run all tests (131 passing)
npm test

# With coverage
npm run test:coverage
```

---

## 7. Custom Domain (Optional)

### Frontend (Cloudflare Pages)

1. Cloudflare Dashboard → Pages → Your project → Custom domains
2. Add `app.advanciapayledger.com`
3. DNS: CNAME record is auto-configured by Cloudflare

### Backend (VPS)

1. Render Dashboard → Settings → Custom Domains
2. Add `api.advanciapayledger.com`
3. DNS: Follow Render's instructions

---

## 8. Post-Deployment Checklist

- [x] Supabase connected
- [x] 131 tests passing
- [x] Frontend deployed to Cloudflare Pages
- [x] Backend deployed to VPS (PM2 + Nginx)
- [x] Stripe webhook configured
- [x] VITE_API_URL set in Cloudflare Pages
- [x] Google OAuth enabled
- [x] SMTP configured (Resend)
- [x] Sentry monitoring enabled

---

## 9. Verified Tests (Feb 19, 2026)

| Test                   | Result                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| Health check           | ✅ `{"status":"healthy","database":"connected","monitoring":"enabled"}` |
| User registration      | ✅ Creates user + session                                               |
| Stripe payment intent  | ✅ `pi_*` created with client secret                                    |
| Frontend accessibility | ✅ HTTP 200                                                             |

---

## 10. Landing Page Integration

The marketing site at `advanciapayledger.com` (built with Rocket.new) needs updated links:

| Current Link          | Should Point To                                       |
| --------------------- | ----------------------------------------------------- |
| `/signup`             | `https://app.advanciapayledger.com/login?mode=signup` |
| `/login`              | `https://app.advanciapayledger.com/login`             |
| "Get Started" button  | `https://app.advanciapayledger.com`                   |
| "Create Free Account" | `https://app.advanciapayledger.com/login?mode=signup` |

**Note**: The landing page promotes crypto payments (BTC, ETH) but the app uses Stripe (card payments). Consider:

1. Adding crypto payment support to the app, OR
2. Updating landing page messaging to reflect card payment features

---

## 11. CI/CD Setup

### GitHub Actions Pipeline

The repository includes a comprehensive CI/CD pipeline (`.github/workflows/ci.yml`) that runs:

| Job                | Description                   |
| ------------------ | ----------------------------- |
| **Lint**           | TypeScript check + ESLint     |
| **Backend Tests**  | Jest tests with mock env vars |
| **Frontend Tests** | Vitest tests                  |
| **Security Scan**  | npm audit + secrets detection |
| **E2E Tests**      | Playwright with Chromium      |

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret Name                 | Description                                |
| --------------------------- | ------------------------------------------ |
| `SUPABASE_URL`              | `https://pikguczsvikzragmrojz.supabase.co` |
| `SUPABASE_ANON_KEY`         | Your Supabase anon key                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key             |
| `STRIPE_SECRET_KEY`         | Your Stripe secret key                     |
| `STRIPE_PUBLISHABLE_KEY`    | Your Stripe publishable key                |

### Branch Protection (Recommended)

1. Go to **Settings → Branches → Add rule**

2. Branch name pattern: `main`
3. Enable:
   - ✅ Require status checks to pass before merging
   - Select: `Lint`, `Backend Tests`, `Frontend Tests`
   - ✅ Require branches to be up to date before merging

### Auto-Deploy

Deployments are automatic on push to `main`:

- **VPS** - Backend: SSH pull + build + PM2 reload (or use deploy script)
- **Cloudflare Pages** - Frontend auto-deploys via GitHub integration

---

## Support

- Cloudflare Pages Docs: <https://developers.cloudflare.com/pages/>
- Supabase Docs: <https://supabase.com/docs>
- Stripe Docs: <https://stripe.com/docs>
