# Domain & Branding — Go-Live Checklist

Use this checklist to finish domain and branding setup. Code and CORS are already in place.

---

## 1. Healthcare Wallet site (advancia-healthcare.com)

**Goal:** Same frontend build serves both PayLedger and Healthcare; the app shows the Healthcare Wallet landing when the host is `advancia-healthcare.com`.

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

### In Cloudflare (if advanciapayroll.com is on Cloudflare)

1. **Pages / Redirect:**  
   - **Rules** → **Page Rules** or **Redirect Rules** (depending on your plan).  
   - Create a rule:
     - **If:** Hostname equals `advanciapayroll.com` (and optionally `www.advanciapayroll.com`).
     - **Then:** Dynamic redirect → **301** → `https://advanciapayledger.com$request_uri`.
2. Save. New visits to advanciapayroll.com will get a 301 to advanciapayledger.com.

### If advanciapayroll.com is elsewhere

- At your DNS/hosting provider, add a **redirect** (301) from `advanciapayroll.com` and `www.advanciapayroll.com` to `https://advanciapayledger.com`.
- Or point the domain to a small host that only returns a 301 (e.g. Netlify/Cloudflare redirect-only page).

### Verify

- Open `https://advanciapayroll.com` (or `http://`). Browser should end up on `https://advanciapayledger.com` with no “Advancia Healthcare” or SmartWallet content on the payroll URL.

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
| advancia-healthcare.com | Healthcare Wallet marketing | Add as custom domain to same Pages project (see §1). |
| advanciapayroll.com | Legacy / redirect only | 301 → advanciapayledger.com (see §2). |

---

## 5. After you finish

- Confirm Healthcare landing: `https://advancia-healthcare.com`
- Confirm redirect: `https://advanciapayroll.com` → `https://advanciapayledger.com`
- Confirm support: test both support@ addresses

Code and CORS for advancia-healthcare.com are already in the repo; no further code changes needed for this checklist.
