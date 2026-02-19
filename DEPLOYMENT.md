# Advancia PayLedger - Deployment Guide

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐
│   Vercel CDN    │────▶│     Supabase         │
│  (Frontend)     │     │    (PostgreSQL +     │
│  app.advancia.us│     │     Auth + API)      │
└─────────────────┘     └──────────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │   Stripe    │
                        │  Payments   │
                        └─────────────┘
```

---

## Prerequisites

- GitHub repository (pdtribe181-prog/modullar-advancia)
- Supabase project: `pikguczsvikzragmrojz` ✅
- Vercel account
- Stripe account with live keys
- Domain: advancia.us

---

## 1. Supabase (Database) ✅ Already Configured

Your Supabase project is ready:
- **URL**: `https://pikguczsvikzragmrojz.supabase.co`
- **80+ tables** with RLS policies
- **131 tests** passing

### Verify Connection
```bash
npx tsx test-connection.ts
```

---

## 2. Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy Frontend

```bash
cd frontend
vercel --prod
```

### Step 3: Add Environment Variables (in Vercel Dashboard)

```env
VITE_API_URL=https://pikguczsvikzragmrojz.supabase.co
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add `app.advancia.us`
3. Update DNS:

| Type | Name | Value |
|------|------|-------|
| CNAME | app | cname.vercel-dns.com |

---

## 3. Backend (Local Development)

### Start Development Server

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`

### Test Health

```bash
curl http://localhost:3000/health
```

---

## 4. Backend (Docker - Optional)

### Build and Run

```bash
docker build -t advancia-api .
docker run -p 3000:3000 --env-file .env advancia-api
```

### Docker Compose

```bash
docker-compose up -d
```

---

## 5. Stripe Webhook Configuration

### Development (Local)

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/stripe/webhook
```

### Production

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-api-url/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `invoice.payment_succeeded`

---

## 6. Environment Variables

### Required (.env)

```env
# Supabase
SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Advancia PayLedger <noreply@advancia.us>

# Server
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## 7. Testing

```bash
# Run all tests
npm test

# With coverage
npm run test:coverage
```

---

## 8. Post-Deployment Checklist

- [ ] Supabase connected: `npm run test:connection`
- [ ] 131 tests passing: `npm test`
- [ ] Frontend deployed to Vercel
- [ ] Stripe webhook configured
- [ ] Email domain verified (advancia.us)

---

## Support

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
