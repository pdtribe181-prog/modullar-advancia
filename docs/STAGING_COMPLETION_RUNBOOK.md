# Staging completion runbook

Step-by-step to finish the unchecked staging items in [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md). Staging API: **api-staging.advanciapayledger.com** → Render service **modullar-advancia.onrender.com**.

---

## 1. Dedicated Supabase staging project

- [ ] In [Supabase Dashboard](https://supabase.com/dashboard), click **New project**.
- [ ] Name it e.g. **advancia-staging**; choose region and strong database password; create.
- [ ] Note: **Project URL** (e.g. `https://xxxx.supabase.co`), **anon key**, **service_role key** (Settings → API).
- [ ] For database webhooks/triggers that need a webhook secret, create one in the staging project and note it (or leave blank if not used in staging).

---

## 2. Configure Render environment variables

- [ ] Open [Render Dashboard](https://dashboard.render.com) → your **modullar-advancia** (or staging) service.
- [ ] **Environment** → Add the following (use staging values only; never production keys here):

| Variable | Where to get it | Example / note |
|----------|-----------------|------------------|
| `NODE_ENV` | Set to `staging` | `staging` |
| `SUPABASE_URL` | Supabase staging project → Settings → API → Project URL | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase staging project → Settings → API → anon public | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase staging project → Settings → API → service_role | Staging service_role key |
| `SUPABASE_WEBHOOK_SECRET` | Your staging webhook secret (if you use DB webhooks) | Optional; separate from prod |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → **Test** secret | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → **Test** publishable | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → **Add endpoint** for staging URL (see below) | `whsec_...` (staging only) |
| `FRONTEND_URL` | Staging frontend origin | `https://staging.advanciapayledger.com` or your staging frontend URL |
| `CORS_ORIGINS` | Staging frontend + localhost | `https://staging.advanciapayledger.com,http://localhost:5173` |
| `RESEND_API_KEY` | Resend (optional for staging) | Test key or same as prod if acceptable |
| `SENTRY_DSN` | Sentry (optional) | Staging DSN; set `SENTRY_ENVIRONMENT=staging` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash (optional) | Staging Redis or shared |

- [ ] Save; trigger a redeploy so the new env is applied.

---

## 3. Staging webhook secrets (separate from production)

- [ ] **Stripe**: In Stripe Dashboard → Webhooks, add endpoint **https://api-staging.advanciapayledger.com/api/v1/stripe/webhook** (or your Render staging URL + path). Use the **signing secret** for this endpoint as `STRIPE_WEBHOOK_SECRET` in Render (do not reuse production webhook secret).
- [ ] **Supabase**: If your app uses Supabase database webhooks, create a dedicated secret in the staging project and set `SUPABASE_WEBHOOK_SECRET` in Render to that value.

---

## 4. Run migrations on staging

- [ ] From your machine (with `.env` pointing at staging Supabase, or use Render shell):

  - **Option A** — Supabase dashboard: SQL Editor → run migrations manually, or  
  - **Option B** — CLI: set `DATABASE_URL` or `SUPABASE_URL`/service role for staging and run your migration script, e.g.  
    `npx tsx scripts/run-migration-rest.ts` (or the script you use for migrations), ensuring it targets the **staging** Supabase project.

- [ ] Verify: in Supabase staging → Table Editor, confirm tables and seed data exist.

---

## 5. Verify staging

- [ ] **Health**: `curl -s https://api-staging.advanciapayledger.com/health` (or your Render URL) returns 200.
- [ ] **Full staging functional tests**: Run auth flow and a payments-test flow against staging API and staging frontend (if deployed). Fix any env or CORS issues.

---

## Reference: .env.staging.example

See repo root **.env.staging.example** for a full list of staging env vars. Copy the shape into Render; never commit real values.

After completing this runbook, tick the staging checkboxes in **PRODUCTION_CHECKLIST.md** (§ Staging Readiness).
