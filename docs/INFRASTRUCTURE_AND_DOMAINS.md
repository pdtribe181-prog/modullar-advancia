# Infrastructure & domains — organized reference

Single place for **Vercel**, **paths**, **VPS (Hostinger)**, **Render**, **Supabase**, and the **three domains**.

---

## 1. Hosting overview

| Layer | Production | Staging |
|-------|------------|---------|
| **Frontend (app)** | **Cloudflare Pages** (deploys from `main`) | Optional: separate Pages project or same project with branch; or not used. |
| **API (backend)** | **VPS** (Hostinger) — `api.advanciapayledger.com` | **Render** — `api-staging.advanciapayledger.com` → `modullar-advancia.onrender.com` |
| **Database + Auth** | **Supabase** (one production project) | **Supabase** (separate staging project; see [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md)) |
| **Vercel** | Optional. `frontend/vercel.json` present; production frontend is Cloudflare Pages. | [VERCEL_AND_VPS_CONFIG.md](VERCEL_AND_VPS_CONFIG.md) |

---

## 2. Three domains — where each is served

**Hosting split:** **advanciapayroll.com** is on **Hostinger** (DNS + redirect only). **advanciapayledger.com** and **advancia-healthcare.com** are on **Cloudflare** (DNS + frontend on Pages). The production API runs on **Hostinger VPS** (api.advanciapayledger.com).

**Repos vs domains:** This codebase (**modullar-advancia**) serves PayLedger and Healthcare only (advanciapayledger.com, advancia-healthcare.com). The **payroll** product has a **separate repo**: [advancia-devuser/advancia-healthcare1](https://github.com/advancia-devuser/advancia-healthcare1) (Next.js, Prisma, Alchemy). The domain advanciapayroll.com does **not** serve that repo in production — it 301-redirects to advanciapayledger.com. See [REPO_MAP.md](REPO_MAP.md).

| Domain | Serves app? | Where hosted | Frontend / API | Notes |
|--------|-------------|--------------|----------------|--------|
| **advanciapayledger.com** | Yes | **Cloudflare** | Cloudflare Pages (same build) \| VPS: `api.advanciapayledger.com` | Primary. No redirect. |
| **www.advanciapayledger.com** | Yes (alias) | Cloudflare | Same as above | 301 → apex (Nginx or Cloudflare). |
| **app.advanciapayledger.com** | Optional | Cloudflare | Same build; add as custom domain in Pages | Optional subdomain. |
| **api.advanciapayledger.com** | — | Cloudflare DNS → VPS | **VPS** (Nginx → PM2 :3000) | Production API only. |
| **advancia-healthcare.com** | Yes | **Cloudflare** | Cloudflare Pages (same build; add as custom domain) \| Same API (VPS) | **Personal** (individuals/patients); Healthcare landing when host matches. |
| **www.advancia-healthcare.com** | Optional | Cloudflare | Same | Add in Pages or 301 → apex. |
| **advanciapayroll.com** | No | **Hostinger** | — | **Leave as redirect only:** 301 → advanciapayledger.com (set in Hostinger). Do not serve payroll app. |
| **www.advanciapayroll.com** | No | Hostinger | — | Same: 301 → advanciapayledger.com in Hostinger. |

**Path summary**

- **Frontend (all app domains):** One build; one Cloudflare Pages project. Custom domains: `advanciapayledger.com`, (optional) `www`, (optional) `app`, `advancia-healthcare.com`, (optional) `www`.
- **API:** One production host (`api.advanciapayledger.com` → VPS). One staging host (`api-staging.advanciapayledger.com` → Render).
- **Auth callbacks:** `https://<domain>/auth/callback` for each domain that runs the app; add all in Supabase Redirect URLs (see [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md)).

---

## 3. Vercel

**Production:** Frontend is on **Cloudflare Pages**. `frontend/vercel.json` is present for optional Vercel deployment (previews or alternate host). **Connect both:** see [CONNECT_VERCEL_AND_CLOUDFLARE.md](CONNECT_VERCEL_AND_CLOUDFLARE.md) for exact steps (root dir = `frontend`, build = `npm run build`, output = `dist`).

**Preview deployments:** If you deploy the frontend to Vercel (e.g. `advancia-healthcare-xxx.pdtribe181-progs-projects.vercel.app`):

- The app treats any hostname matching `advancia-healthcare*.vercel.app` as the **Healthcare** landing (same as advancia-healthcare.com). See `frontend/src/config/domains.ts`.
- To call the API from a Vercel preview URL, add that origin to backend **CORS**: set `CORS_ORIGINS` (e.g. `https://advancia-healthcare-j2zgqq34j-pdtribe181-progs-projects.vercel.app`) in the API env, or run the API locally and point the preview at `http://localhost:5173` for full stack testing.
- If the preview returns **401**: the deployment may have Vercel Password Protection or be private; open it in a browser where you’re logged into Vercel, or disable protection in the Vercel project settings.

---

## 4. Paths and URLs (quick reference)

| Purpose | Production | Staging |
|---------|------------|---------|
| **App (root)** | `https://advanciapayledger.com` | — |
| **App (Healthcare)** | `https://advancia-healthcare.com` | — |
| **API base** | `https://api.advanciapayledger.com/api/v1` | `https://api-staging.advanciapayledger.com/api/v1` |
| **Health** | `https://api.advanciapayledger.com/health` | `https://api-staging.advanciapayledger.com/health` |
| **Docs** | `https://api.advanciapayledger.com/docs` | Same path on staging URL |
| **Supabase** | One production project URL/keys in VPS `.env` | Separate staging project URL/keys in Render env |
| **Stripe webhook (API)** | `https://api.advanciapayledger.com/api/v1/stripe/webhook` | `https://api-staging.advanciapayledger.com/api/v1/stripe/webhook` (use separate secret) |

---

## 5. VPS — production API (Hostinger)

| Item | Value |
|------|--------|
| **Provider** | Hostinger VPS |
| **IP** | `76.13.77.8` |
| **App dir** | `/var/www/advancia` |
| **PM2 process** | `advancia-api` |
| **Port** | `3000` (Nginx proxies to it) |
| **Public hostname** | `api.advanciapayledger.com` |

**Deploy:** `npm run deploy:vps -- --apply` (uses `scripts/vps-deploy.ts`). Optional env: `VPS_HOST`, `VPS_USER`, `VPS_APP_DIR`.  
**Config:** `config/ecosystem.config.cjs`, `nginx/advancia.conf`.  
**Full reference:** [VERCEL_AND_VPS_CONFIG.md](VERCEL_AND_VPS_CONFIG.md) (VPS section).

---

## 6. Render (staging API)

| Item | Value |
|------|--------|
| **Service** | `modullar-advancia` (or advancia-api) on Render |
| **URL (Render)** | `https://modullar-advancia.onrender.com` |
| **Custom domain** | `api-staging.advanciapayledger.com` (DNS → Render) |
| **Health** | `/health` |
| **Supabase** | Use a **dedicated staging Supabase project** (not production). |

**Config:** `config/render.yaml` (blueprint). Set env vars in Render Dashboard; see [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md).

---

## 7. Supabase

| Environment | Use | Where configured |
|-------------|-----|-------------------|
| **Production** | One project. Used by VPS API and by frontend (auth, DB). | VPS `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Frontend build env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. |
| **Staging** | Separate project. Used by Render staging API (and optionally staging frontend). | Render env vars; see [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md). |

**Auth (all three domains):** In Supabase Dashboard → Authentication → URL Configuration, add **Redirect URLs** for every domain that runs the app (advanciapayledger.com, www, app, advancia-healthcare.com, www, localhost). See [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md).

---

## 8. Responsible way to follow (recommended order)

Do the steps below **in this order** so each step builds on the previous one and you don’t break production.

| Order | Step | Why this order |
|-------|------|-----------------|
| **1** | **Domains & DNS** | Get hostnames resolving and (for payroll) redirecting before relying on them for OAuth or app. |
| **2** | **OAuth (Supabase + Google)** | Add callback URLs and origins for every domain that will run the app, so sign-in works on PayLedger and personal (advancia-healthcare.com). |
| **3** | **Emails** | Configure support@ (and optional addresses) so users can reach you from both domains. |
| **4** | **VPS `.env`** | Confirm production API has `FRONTEND_URL`, Supabase, Stripe, etc., so links and CORS work. |
| **5** | **Staging (optional)** | Only after production is stable; follow [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md). |
| **6** | **Tests** | Run `npm test` and E2E to confirm nothing is broken. |
| **7** | **Verify DNS** | Run `npm run verify:domains` to confirm all three domains resolve and (where applicable) HTTPS and API health respond. |

**Rules of thumb**

- Don’t add a domain to Supabase/Google until DNS is pointing (or you’ll get invalid redirect errors).
- Don’t switch production env (e.g. Stripe live) until OAuth and domains are correct.
- After any DNS or env change, run `npm run verify:domains` and spot-check login on both PayLedger and advancia-healthcare.com.

---

## 9. Proceed — completion order (detailed)

1. **Domains & DNS**
   - Cloudflare Pages: add `advancia-healthcare.com` (and optional www) as custom domain.
   - Hostinger: 301 redirect `advanciapayroll.com` and www → `https://advanciapayledger.com` (Websites → Redirects).
   - Optional: add www CNAME for advanciapayledger.com if not already (or keep redirect-only).

2. **OAuth**
   - Supabase: add all app callback URLs (see [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md)).
   - Google Cloud Console: add all app origins to Authorized JavaScript origins.

3. **Emails**
   - Configure support@ for advanciapayledger.com and advancia-healthcare.com ([EXTRA_EMAILS_SETUP.md](EXTRA_EMAILS_SETUP.md) for optional addresses).

4. **Hostinger VPS**
   - Confirm `.env` on the Hostinger VPS has `FRONTEND_URL`, Supabase, Stripe, etc. ([PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)).

5. **Staging (optional)**
   - Follow [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md): Supabase staging project → Render env → migrations → webhooks.

6. **Tests**
   - Run `npm install` (root) and `cd frontend && npm install`; then `npm test` and `npm run playwright:install` + `npm run test:e2e` or `test:e2e:api`. See [PROJECT_COMPLETION_STATUS.md](PROJECT_COMPLETION_STATUS.md).

7. **Verify DNS (all three domains)**
   - Run: `npm run verify:domains` (runs DNS checks for advanciapayledger.com, advancia-healthcare.com, advanciapayroll.com).
   - Or per domain: `npm run verify:dns -- --domain advanciapayledger.com` (then repeat for the other two).

---

## 10. Related docs

| Doc | Content |
|-----|--------|
| [VERCEL_AND_VPS_CONFIG.md](VERCEL_AND_VPS_CONFIG.md) | Vercel (not used), VPS details, deploy commands |
| [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md) | Three domains, redirects, Supabase/Google OAuth |
| [DOMAIN_AND_BRANDING_CHECKLIST.md](DOMAIN_AND_BRANDING_CHECKLIST.md) | Healthcare domain, payroll redirect, support emails |
| [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md) | Render + Supabase staging setup |
| [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) | Full production go-live checklist |
| [PROJECT_COMPLETION_STATUS.md](PROJECT_COMPLETION_STATUS.md) | Build/test status and remaining manual steps |
