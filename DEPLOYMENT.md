# Advancia PayLedger - Deployment Guide

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Vercel CDN    │────▶│     Render.com       │────▶│    Supabase     │
│  (Frontend)     │     │   (Express API)      │     │  (PostgreSQL)   │
│  React + Vite   │     │     Backend          │     │   Auth + RLS    │
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

| Service | URL | Status |
|---------|-----|--------|
| Frontend | https://app.advancia.us | ✅ Live |
| Backend | https://modullar-advancia.onrender.com | ✅ Live |
| Database | https://pikguczsvikzragmrojz.supabase.co | ✅ Connected |

---

## Prerequisites

- GitHub repository: `pdtribe181-prog/modullar-advancia`
- Supabase project: `pikguczsvikzragmrojz` ✅
- Vercel account ✅
- Render account (free tier)
- Stripe account
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

## 2. Backend Deployment (Render)

### Option A: One-Click Deploy (Blueprint)

1. Go to https://dashboard.render.com/
2. Click **"New" → "Blueprint"**
3. Connect your GitHub repo: `pdtribe181-prog/modullar-advancia`
4. Render will use `render.yaml` to configure everything

### Option B: Manual Setup

1. Go to https://dashboard.render.com/
2. Click **"New" → "Web Service"**
3. Connect GitHub repo
4. Configure:
   - **Name**: `advancia-api`
   - **Region**: Ohio (US East)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Environment Variables (in Render Dashboard)

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@advancia.us
FRONTEND_URL=https://app.advancia.us
```

---

## 3. Frontend Deployment (Vercel) ✅ Deployed

**Live**: https://frontend-pink-nu-46.vercel.app

### Redeploy if needed

```bash
cd frontend
vercel --prod
```

### Environment Variables (in Vercel Dashboard)

```env
VITE_API_URL=https://modullar-advancia.onrender.com
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
2. Add endpoint: `https://modullar-advancia.onrender.com/stripe/webhook`
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

### Frontend (Vercel)

1. Vercel Dashboard → Settings → Domains
2. Add `app.advancia.us`
3. DNS: `CNAME app → cname.vercel-dns.com`

### Backend (Render)

1. Render Dashboard → Settings → Custom Domains
2. Add `api.advancia.us`
3. DNS: Follow Render's instructions

---

## 8. Post-Deployment Checklist

- [x] Supabase connected
- [x] 131 tests passing
- [x] Frontend deployed to Vercel
- [x] Backend deployed to Render
- [ ] Stripe webhook configured
- [ ] VITE_API_URL set in Vercel

---

## Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
