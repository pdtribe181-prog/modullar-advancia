# Domain & Branding — Go-Live Checklist

Use this checklist to finish domain and branding setup. Code and CORS are already in place so **all three app domains work without errors**.

---

## Domains working — quick verification

After you complete the manual steps below, confirm:

| Check | URL / action |
|-------|----------------|
| PayLedger app loads | `https://advanciapayledger.com` → PayLedger landing, nav works |
| Healthcare app loads | `https://advancia-healthcare.com` → Healthcare Wallet landing, correct support email |
| No CORS errors | From both domains, login and API calls (e.g. dashboard) work; browser console has no CORS errors |
| OAuth works | Sign in with Google on both domains; callback stays on same domain |
| Payroll redirects | `https://advanciapayroll.com` → 301 → `https://advanciapayledger.com` |

**Code:** Backend always allows the five app origins (PayLedger, www, app, Healthcare, www); unknown origins are denied without returning 500. Frontend uses `frontend/src/config/domains.ts` as single source of truth for hostnames and support email.

---

## What we have already (reference)

- **Frontend**
  - **config/domains.ts**: Single source of truth — `isHealthcareHost()`, `getSupportEmail()`, `SIGNUP_ORIGIN`.
  - **App.tsx**: Uses `isHealthcareHost()` — `advancia-healthcare.com` / `www` → **HealthcareLanding**, else **LandingPage**.
  - **Layout.tsx**: Uses `isHealthcareHost()` and `getSupportEmail()` for brand and support email.
  - **HealthcareLanding.tsx**: Uses `SIGNUP_ORIGIN` for signup links; support mailto for Healthcare.
  - **Contact, FAQ, Withdraw, Policy**: Support/enterprise/privacy/gdpr/security/hello/legal addresses point to advanciapayledger.com (see EXTRA_EMAILS_SETUP.md).
- **Backend**
  - **security.middleware.ts**: **APP_ORIGINS** always includes all five app domains (PayLedger, www, app, Healthcare, www); unknown origins get `callback(null, false)` (no 500). Plus `FRONTEND_URL` and `CORS_ORIGINS`.
  - **auth.routes.ts**: Password reset and identity-link redirect use `FRONTEND_URL` (single primary origin).
  - **connect.routes.ts**, **stripe.routes.ts**: Stripe/Connect redirect URLs use `FRONTEND_URL`.
- **Config / scripts**
  - **.env.example**: `FRONTEND_URL`, `CORS_ORIGINS` commented example including Healthcare.
  - **scripts/setup-vps.sh**: Generated `.env` includes `FRONTEND_URL` and `CORS_ORIGINS` with PayLedger + Healthcare origins.
  - **nginx/advancia.conf**: www.advanciapayledger.com → 301 → apex; API on api.advanciapayledger.com.
- **Docs**
  - **ARCHITECTURE.md**: Domains & products mapping + link to DOMAINS_AND_GOOGLE_OAUTH.md.
  - **DOMAINS_AND_GOOGLE_OAUTH.md**: Domain roles, redirects, Supabase/Google OAuth checklist.
  - **DOMAIN_ROUTER_AND_API.md**: Router, API, navigation, and responsiveness for all 3 domains (same behavior on both app domains).
  - **DOMAIN_AND_BRANDING_CHECKLIST.md**: This checklist (Healthcare, payroll redirect, support emails, OAuth link).
  - **EXTRA_EMAILS_SETUP.md**: enterprise@, privacy@, gdpr@, security@, hello@, legal@ — where used, how to configure.
  - **OPEN_PRS_TRIAGE.md**: Open PR list + merge order and `gh` commands.
  - **STAGING_COMPLETION_RUNBOOK.md**: Staging Supabase, Render env, migrations, webhooks, verification.
  - **PRODUCTION_CHECKLIST.md**: Links to staging runbook; full pre-flight checklist.
  - **REPO_MAP.md**, **CANONICAL_REPO_BANNER.md**: Repo roles and canonical/mirror.
  - **README.md**: Canonical repo note, mirror, `push:mirror`, link to domain checklist and REPO_MAP.

---

## 1. Healthcare Wallet site — personal (advancia-healthcare.com)

**Goal:** Same frontend build serves both PayLedger and Healthcare. **advancia-healthcare.com** is for the **personal** segment (individuals/patients, personal folder); the app shows the Healthcare Wallet landing when the host is `advancia-healthcare.com`.

### In Cloudflare Pages

1. Open the Cloudflare dashboard → **Pages** → the project that serves **advanciapayledger.com**.
2. Go to **Custom domains** (or **Settings** → **Custom domains**).
3. Click **Set up a custom domain**.
4. Add:
   - `advancia-healthcare.com`
   - (Optional) `www.advancia-healthcare.com`
5. Follow the prompts; Cloudflare will add the required DNS records if the zone is on Cloudflare.
6. Wait for SSL to provision (usually 1–2 minutes).

**If the domain is on another registrar:** In your DNS provider, add a **CNAME** for `advancia-healthcare.com` (or `www`) pointing to the Cloudflare Pages hostname shown in the dashboard (e.g. `your-project.pages.dev` or the custom domain target they give you).

### Verify

- Visit `https://advancia-healthcare.com`. You should see the **Advancia Healthcare Wallet** landing (hero, Wallet, Health Module, Payments, Security sections).
- Footer and header should say **Advancia Healthcare** and use `support@advancia-healthcare.com`.

---

## 2. Payroll domain redirect (advanciapayroll.com)

**Goal:** All traffic to advanciapayroll.com goes permanently to advanciapayledger.com (no duplicate content, no wrong branding).

**Hosting:** **advanciapayroll.com** is on **Hostinger**. **advanciapayledger.com** is on **Cloudflare** (Pages + API on VPS). Do **not** add payroll as a custom domain on Cloudflare Pages — redirect is configured on Hostinger only.

**If www.advanciapayroll.com (or apex) currently shows the app** (e.g. “Advancia Healthcare”): remove `advanciapayroll.com` and `www.advanciapayroll.com` from any other host (e.g. Cloudflare Pages → Custom domains) so only Hostinger handles payroll. Then set up the redirect in Hostinger below.

### In Hostinger (payroll domain)

1. Log in to **Hostinger** → **Websites** → select the site or domain for **advanciapayroll.com**.
2. Open **Redirects** (sidebar or in the dashboard).
3. Create **two** 301 redirects (or one rule that covers both if your plan allows):
   - **From:** `advanciapayroll.com` (and optionally `www.advanciapayroll.com` if listed separately)  
   - **To:** `https://advanciapayledger.com`  
   - Type: **Permanent (301)**.
4. If you have both apex and www, add a second redirect for `www.advanciapayroll.com` → `https://advanciapayledger.com` (301).
5. Save. Ensure SSL is active for the payroll domain if redirecting to HTTPS (Hostinger usually provides it).

Reference: [Hostinger – Set up a redirect](https://www.hostinger.com/support/1583406-how-to-set-up-a-redirect-in-hostinger).

### Verify

- Open `https://advanciapayroll.com` and `https://www.advanciapayroll.com`. Both should immediately redirect to `https://advanciapayledger.com` with no app content on the payroll URL.

---

## 3. Support emails

**Goal:** Emails sent from the app (Contact, FAQ, footer) reach you.

| Address | Where used | Suggested setup |
|--------|------------|-----------------|
| `support@advanciapayledger.com` | PayLedger site (footer, FAQ, Contact, Withdraw) | Cloudflare Email Routing or your registrar/host: create inbox or forward to your main email. |
| `support@advancia-healthcare.com` | Healthcare site (footer, “Talk to Our Team” CTA) | Same: Email Routing or forward for this domain. |

### Cloudflare Email Routing (if DNS is on Cloudflare)

1. For each domain: **Email** → **Email Routing** → **Get started**.
2. Add **Destination address** (your real inbox).
3. Add **Custom address**: `support` → forward to that destination.
4. Add the MX and optional DKIM/SPF records Cloudflare shows (if not already set).

### Verify

- Send a test to `support@advanciapayledger.com` and `support@advancia-healthcare.com`; confirm delivery (and check spam).

---

## 4. Quick reference

| Domain | Purpose | Action |
|--------|--------|--------|
| advanciapayledger.com | PayLedger marketing + app | Already live; ensure Cloudflare Pages deploys from `main`. |
| app.advanciapayledger.com | App (optional alias) | Add as custom domain to same Pages project if desired. |
| api.advanciapayledger.com | API | Already on VPS; no change. |
| advancia-healthcare.com | **Personal** (personal folder); Healthcare Wallet marketing | Add as custom domain to same Pages project (see §1). |
| advanciapayroll.com | Legacy / redirect only | 301 → advanciapayledger.com (see §2). |

**Important:** Do **not** add `advanciapayroll.com` or `www.advanciapayroll.com` as custom domains to Cloudflare Pages. If they are added, the app will be served there (e.g. Healthcare-style landing) instead of redirecting. Use **redirect rules only** so both apex and www → `https://advanciapayledger.com`.

---

## 5. Google OAuth & Supabase redirects

For **Google sign-in** to work on both **advanciapayledger.com** and **advancia-healthcare.com**, you must add each domain’s callback URL in **Supabase** (and, if needed, origins in **Google Cloud Console**). See **[DOMAINS_AND_GOOGLE_OAUTH.md](./DOMAINS_AND_GOOGLE_OAUTH.md)** for:

- Which redirect URIs to add in Supabase (Redirect URLs).
- What to set in Google OAuth client (Authorized redirect URIs and JavaScript origins).
- Why **advanciapayroll.com** does not need OAuth (redirect-only).

---

## 6. After you finish

- Confirm Healthcare landing: `https://advancia-healthcare.com`
- Confirm redirect: `https://advanciapayroll.com` → `https://advanciapayledger.com`
- Confirm support: test both support@ addresses

Code and CORS for advancia-healthcare.com are already in the repo; no further code changes needed for this checklist.

---

## 7. What’s still to do (gaps)

### Manual / external (you do these)

| Item | Where | Status |
|------|--------|--------|
| Add **advancia-healthcare.com** (and optional www) as custom domain | Cloudflare Pages → same project as PayLedger | [ ] |
| 301 redirect **advanciapayroll.com** and www → advanciapayledger.com | Hostinger → Websites → Redirects | [ ] |
| Add all app callback URLs | Supabase → Authentication → URL Configuration → Redirect URLs | [ ] |
| Add all app origins | Google Cloud Console → OAuth client → Authorized JavaScript origins | [ ] |
| Configure **support@** for both domains | Email routing / forwarding (e.g. Cloudflare Email Routing) | [ ] |
| VPS `.env`: `FRONTEND_URL`, optional `CORS_ORIGINS` | Hostinger VPS (api.advanciapayledger.com) | [ ] |

### Optional email addresses (advanciapayledger.com)

The app and docs reference these; set up forwarding or mailboxes if you want them to work:

- **support@** — required (checklist above)
- **enterprise@** — Contact page
- **privacy@**, **gdpr@**, **security@**, **hello@** — Policy, Security, docs
- **legal@** — Terms of Service (links to Contact)

**Step-by-step:** [docs/EXTRA_EMAILS_SETUP.md](docs/EXTRA_EMAILS_SETUP.md) — addresses, where they’re used, and Cloudflare/registrar setup.

### Optional / later

- **Staging**: PRODUCTION_CHECKLIST has unchecked staging items (Supabase staging project, Render env, webhook secrets, etc.).
- **Backend “Link Google” from Healthcare**: If a user on advancia-healthcare.com uses a backend-initiated link flow, they are sent to `FRONTEND_URL/auth/callback` (PayLedger). Normal sign-in from Healthcare uses the current origin, so callbacks stay on Healthcare. Only relevant if you add a “Link Google” flow that runs from the Healthcare site.
- **Open PRs**: See `docs/OPEN_PRS_TRIAGE.md` for suggested merge order if you want to land doc/feature branches.
