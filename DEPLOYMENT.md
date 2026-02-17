# Advancia PayLedger - Production Deployment Guide

## Prerequisites

- GitHub repository
- Google Cloud account with billing enabled
- Vercel account ([vercel.com](https://vercel.com))
- Stripe account with live keys
- Domain: advancia.us (verified for email)

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Vercel CDN    │────▶│  Google Cloud Run    │────▶│  Supabase   │
│  (Frontend)     │     │    (Backend API)     │     │ (PostgreSQL)│
│  app.advancia.us│     │  api.advancia.us     │     │             │
└─────────────────┘     └──────────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │   Stripe    │
                        │  Payments   │
                        └─────────────┘
```

---

## 1. Backend Deployment (Google Cloud Run)

### Step 1: Install Google Cloud CLI

```powershell
# Windows (PowerShell as Admin)
winget install Google.CloudSDK
```

```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
```

### Step 2: Initialize GCP Project

```bash
# Login to Google Cloud
gcloud auth login

# Create new project (or use existing)
gcloud projects create advancia-payledger --name="Advancia PayLedger"

# Set as default project
gcloud config set project advancia-payledger

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

### Step 3: Configure Secrets (Recommended)

Store sensitive values in Secret Manager:

```bash
# Create secrets
echo -n "your-supabase-service-key" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
echo -n "sk_live_xxxxx" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "whsec_xxxxx" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
echo -n "re_E1MmJVq7_2crpxA8m38dKVi2pvPapmLGX" | gcloud secrets create RESEND_API_KEY --data-file=-
echo -n "your-jwt-secret-at-least-32-chars" | gcloud secrets create JWT_SECRET --data-file=-
```

### Step 4: Deploy with Cloud Build (Automated)

```bash
# Submit build (from project root)
gcloud builds submit --config=cloudbuild.yaml
```

### Step 5: Deploy Manually (Alternative)

```bash
# Build and push image
gcloud builds submit --tag gcr.io/advancia-payledger/api

# Deploy to Cloud Run
gcloud run deploy advancia-payledger-api \
  --image gcr.io/advancia-payledger/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co" \
  --set-env-vars "FRONTEND_URL=https://app.advancia.us" \
  --set-env-vars "EMAIL_FROM=Advancia PayLedger <noreply@advancia.us>" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest" \
  --set-secrets "STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest" \
  --set-secrets "STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest" \
  --set-secrets "RESEND_API_KEY=RESEND_API_KEY:latest" \
  --set-secrets "JWT_SECRET=JWT_SECRET:latest"
```

### Step 6: Get Service URL

```bash
gcloud run services describe advancia-payledger-api \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

Output: `https://advancia-payledger-api-xxxxx-uc.a.run.app`

### Step 7: Custom Domain (api.advancia.us)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service advancia-payledger-api \
  --domain api.advancia.us \
  --region us-central1
```

Add the DNS records shown to your domain registrar.

---

## 2. Frontend Deployment (Vercel)

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`

### Step 2: Configure Build Settings

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variables

```env
VITE_API_URL=https://api.advancia.us
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_SUPABASE_URL=https://pikguczsvikzragmrojz.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Step 4: Deploy

Click **"Deploy"** and wait for build to complete.

### Step 5: Custom Domain

1. Go to **Settings** → **Domains**
2. Add `app.advancia.us`
3. Add DNS records as instructed

---

## 3. Stripe Webhook Configuration

### Step 1: Create Production Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Switch to **Live mode**
3. Click **"Add endpoint"**
4. Enter URL: `https://api.advancia.us/api/payments/webhook`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `account.updated`
   - `payout.paid`
   - `payout.failed`

### Step 2: Update Webhook Secret

```bash
# Update secret in Secret Manager
echo -n "whsec_xxxxx" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-

# Redeploy to pick up new secret
gcloud run services update advancia-payledger-api --region us-central1
```

---

## 4. Set Up CI/CD with Cloud Build Triggers

### Automatic deployments on push:

```bash
# Connect GitHub repository
gcloud builds triggers create github \
  --name="deploy-on-push" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --repo-name="modullar-advancia" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

---

## 5. HIPAA Compliance Configuration

For healthcare apps, enable additional security:

```bash
# Enable VPC connector (private networking)
gcloud compute networks vpc-access connectors create advancia-connector \
  --region us-central1 \
  --range 10.8.0.0/28

# Update service with VPC connector
gcloud run services update advancia-payledger-api \
  --vpc-connector advancia-connector \
  --region us-central1

# Enable Cloud Audit Logs
gcloud services enable cloudaudit.googleapis.com
```

Request BAA from Google: https://cloud.google.com/security/compliance/hipaa

---

## 6. Monitoring & Logging

### View Logs

```bash
# Stream logs
gcloud run services logs read advancia-payledger-api --region us-central1 --follow

# Or use Cloud Console
# https://console.cloud.google.com/run/detail/us-central1/advancia-payledger-api/logs
```

### Set Up Alerts

```bash
# Create uptime check
gcloud monitoring uptime create \
  --display-name="API Health Check" \
  --resource-type=cloud-run-revision \
  --service-name=advancia-payledger-api \
  --path=/health
```

---

## 7. Cost Optimization

Cloud Run pricing (as of 2026):
- **CPU**: $0.00002400/vCPU-second
- **Memory**: $0.00000250/GiB-second
- **Requests**: $0.40/million

**Tips:**
- Set `--min-instances 0` to scale to zero
- Use `--cpu-throttling` for background jobs
- Enable `--cpu-boost` for faster cold starts

---

## 8. Post-Deployment Checklist

### Backend Verification
- [ ] Health check: `curl https://api.advancia.us/health`
- [ ] API responds: `curl https://api.advancia.us/api/health`
- [ ] Stripe webhook verified in dashboard

### Frontend Verification
- [ ] Site loads at https://app.advancia.us
- [ ] Login/signup works
- [ ] Provider dashboard accessible
- [ ] Appointment booking works

### Email Verification
- [ ] Test email sends from noreply@advancia.us
- [ ] Appointment confirmations working
- [ ] Payment receipts delivered

### Security
- [ ] HTTPS on all endpoints
- [ ] Secrets in Secret Manager (not env vars)
- [ ] CORS configured for production only
- [ ] Cloud Audit Logs enabled

---

## 9. DNS Configuration Summary

| Subdomain | Type | Target |
|-----------|------|--------|
| `api.advancia.us` | CNAME | `ghs.googlehosted.com` |
| `app.advancia.us` | CNAME | `cname.vercel-dns.com` |
| `advancia.us` | A | Vercel IP (76.76.21.21) |

---

## Troubleshooting

### Build Failures
```bash
# View build logs
gcloud builds list --limit=5
gcloud builds describe BUILD_ID
```

### Cold Start Latency
```bash
# Set minimum instances to reduce cold starts
gcloud run services update advancia-payledger-api \
  --min-instances 1 \
  --region us-central1
```

### Secret Access Issues
```bash
# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Quick Commands Reference

```bash
# Deploy
gcloud builds submit --config=cloudbuild.yaml

# View logs
gcloud run services logs read advancia-payledger-api --region us-central1

# Update env var
gcloud run services update advancia-payledger-api \
  --set-env-vars "KEY=value" --region us-central1

# Scale
gcloud run services update advancia-payledger-api \
  --min-instances 1 --max-instances 20 --region us-central1

# Delete (cleanup)
gcloud run services delete advancia-payledger-api --region us-central1
```

---

## Support

- GCP Cloud Run Docs: https://cloud.google.com/run/docs
- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
- Resend Docs: https://resend.com/docs
