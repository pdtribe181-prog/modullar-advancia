# Manual steps — full details (copy-paste ready)

Use this with [MANUAL_STEPS_CHECKLIST.md](MANUAL_STEPS_CHECKLIST.md). All values below are production-ready; replace placeholders like `your-project.supabase.co` with your actual project ref.

---

## 1. Cloudflare Pages — add advancia-healthcare.com

**Where:** [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → select the project that serves **advanciapayledger.com**.

**Steps:**
1. Go to **Custom domains** (or **Settings** → **Custom domains**).
2. Click **Set up a custom domain**.
3. Enter: `advancia-healthcare.com` → Add.
4. (Optional) Add: `www.advancia-healthcare.com`.
5. Follow prompts; Cloudflare will add DNS if the zone is on Cloudflare. Wait for SSL (1–2 minutes).

**If the domain is elsewhere:** In your DNS provider, add a **CNAME** for `advancia-healthcare.com` pointing to the Pages hostname Cloudflare shows (e.g. `your-project.pages.dev`).

**Verify:** Open `https://advancia-healthcare.com` — you should see the Healthcare Wallet landing and `support@advancia-healthcare.com` in the footer.

---

## 1b. Cloudflare DNS — www for advanciapayledger.com

**Where:** [Cloudflare Dashboard](https://dash.cloudflare.com) → **advanciapayledger.com** → **DNS** → **Records**.

**Add one record** (so `npm run verify:domains` passes for www):

| Type | Name | Target | Proxy |
|------|------|--------|--------|
| CNAME | `www` | `advanciapayledger.com` | Proxied (orange cloud) |

**Verify:** `npm run verify:domains` — CNAME (www.advanciapayledger.com) should show ✅.

---

## 2. Hostinger — 301 redirect advanciapayroll.com

**Where:** [Hostinger](https://www.hostinger.com) → **Websites** → select the site/domain for **advanciapayroll.com** → **Redirects**.

**Create two permanent (301) redirects:**

| From | To |
|------|-----|
| `advanciapayroll.com` | `https://advanciapayledger.com` |
| `www.advanciapayroll.com` | `https://advanciapayledger.com` |

**Important:** Do **not** add advanciapayroll.com as a custom domain on Cloudflare Pages; only Hostinger should handle that domain (redirect only).

**Verify:** Open `https://advanciapayroll.com` and `https://www.advanciapayroll.com` — both must redirect to `https://advanciapayledger.com`.

---

## 3. Supabase — Redirect URLs and Site URL

**Where:** [Supabase Dashboard](https://supabase.com/dashboard) → your **production project** → **Authentication** → **URL Configuration**.

### Site URL (one line)
```
https://advanciapayledger.com
```

### Redirect URLs (add each line)
```
https://advanciapayledger.com/auth/callback
https://www.advanciapayledger.com/auth/callback
https://app.advanciapayledger.com/auth/callback
https://advancia-healthcare.com/auth/callback
https://www.advancia-healthcare.com/auth/callback
http://localhost:5173/auth/callback
http://localhost:5174/auth/callback
```

**Do not add** `https://advanciapayroll.com/auth/callback` (that domain only redirects; no sign-in there).

---

## 4. Google Cloud Console — OAuth client

**Where:** [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your **OAuth 2.0 Client ID** (the one Supabase uses for Google sign-in).

### Authorized JavaScript origins (add each)
```
https://advanciapayledger.com
https://www.advanciapayledger.com
https://app.advanciapayledger.com
https://advancia-healthcare.com
https://www.advancia-healthcare.com
http://localhost:5173
http://localhost:5174
```

### Authorized redirect URIs
Keep the **Supabase** callback (Google redirects to Supabase; Supabase then redirects to your app):
```
https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
```
Replace `<YOUR-PROJECT-REF>` with your Supabase project reference (e.g. from your Supabase URL: `https://abcdefgh.supabase.co` → ref is `abcdefgh`).

---

## 5. Support email (Cloudflare Email Routing)

**Where:** [Cloudflare Dashboard](https://dash.cloudflare.com) → select **advanciapayledger.com** (or the zone that has it) → **Email** → **Email Routing**.

**For advanciapayledger.com:**
1. **Get started** if needed.
2. **Destination address:** your real inbox (e.g. `you@gmail.com`).
3. **Custom address:** `support` → forward to that destination.

**Repeat for advancia-healthcare.com** (if that domain’s DNS is in Cloudflare): same steps, add `support@advancia-healthcare.com` → forward to your inbox.

**Verify:** Send a test email to `support@advanciapayledger.com` and `support@advancia-healthcare.com`; check delivery and spam.

---

## 6. VPS .env (Hostinger production API)

**Where:** SSH to VPS (e.g. `ssh root@76.13.77.8` or your VPS user/host). Edit `/var/www/advancia/.env` (or the path you use for the app).

**Required and recommended variables (production values):**

```bash
NODE_ENV=production
PORT=3000

# Supabase (production project)
SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Stripe (live keys for production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Primary frontend (password reset, Stripe redirects)
FRONTEND_URL=https://advanciapayledger.com

# Optional: explicit CORS list (app already allows PayLedger + Healthcare by default)
# CORS_ORIGINS=https://advanciapayledger.com,https://www.advanciapayledger.com,https://app.advanciapayledger.com,https://advancia-healthcare.com,https://www.advancia-healthcare.com

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=Advancia PayLedger <noreply@advanciapayledger.com>

# SMS (Twilio) — optional
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=+1...

# Redis (Upstash recommended)
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# Security
TRUST_PROXY=true
```

**Get Supabase keys:** Supabase Dashboard → **Settings** → **API** (Project URL, anon key, service_role key).  
**Get Stripe keys:** Stripe Dashboard → **Developers** → **API keys** (live).  
**Webhook secret:** Stripe → **Developers** → **Webhooks** → endpoint `https://api.advanciapayledger.com/api/v1/stripe/webhook` → **Signing secret**.

After editing, restart the API (e.g. `pm2 restart advancia-api` or your process name).

**Verify:** `curl -s https://api.advanciapayledger.com/health | jq`

---

## 7. Cloudflare security (recommended)

**Where:** Cloudflare Dashboard → select the zone for **advanciapayledger.com** (and advancia-healthcare.com if same zone).

| Setting | Location | Value |
|--------|----------|--------|
| **SSL/TLS** | SSL/TLS → Overview | **Full (strict)** |
| **Bot Fight Mode** | Security → Bots | **On** |
| **Rate limiting** | Security → WAF (or Rate rules) | Create rules as needed (e.g. limit login path). |

---

## 8. DMARC (optional, when ready)

**Where:** DNS for **advanciapayledger.com** (and advancia-healthcare.com if you want DMARC there).

**Add TXT record:**
- **Name:** `_dmarc`
- **Content:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@advanciapayledger.com; pct=100; adkim=s; aspf=s
```

Ensure `dmarc@advanciapayledger.com` receives mail (e.g. forward to your inbox).

---

## Quick reference URLs

| Purpose | URL |
|--------|-----|
| PayLedger app | https://advanciapayledger.com |
| Healthcare app | https://advancia-healthcare.com |
| API health | https://api.advanciapayledger.com/health |
| API docs | https://api.advanciapayledger.com/docs |
| Stripe webhook (production) | https://api.advanciapayledger.com/api/v1/stripe/webhook |

**VPS:** Hostinger, IP `76.13.77.8`, app dir `/var/www/advancia`, PM2 process `advancia-api`, port `3000` (Nginx proxies to it).

---

## After you finish

1. Run: `npm run verify:domains`
2. Open https://advanciapayledger.com and https://advancia-healthcare.com → test login (email and Google if configured); no CORS errors.
3. Open https://advanciapayroll.com → must redirect to https://advanciapayledger.com

See also: [WHATS_NEEDED.md](WHATS_NEEDED.md), [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md), [DOMAIN_AND_BRANDING_CHECKLIST.md](DOMAIN_AND_BRANDING_CHECKLIST.md).
