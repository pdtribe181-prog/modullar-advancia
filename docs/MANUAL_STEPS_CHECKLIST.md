# Manual steps checklist — what only you can do

Everything in this list requires **your** access to a dashboard or server. The repo cannot do these for you. Tick as you complete.

**Copy-paste values and full instructions:** [MANUAL_STEPS_DETAILS.md](MANUAL_STEPS_DETAILS.md)

---

## 1. Domains & hosting

| Done | Task | Where | Notes |
|------|------|--------|------|
| [ ] | Add **advancia-healthcare.com** (and optional www) as custom domain | **Cloudflare** → Pages → your project → Custom domains | Same project as PayLedger. SSL auto-provisions. |
| [ ] | 301 redirect **advanciapayroll.com** and www → advanciapayledger.com | **Hostinger** → Websites → Redirects | Permanent redirect only; do not serve app on payroll domain. |

**Verify:** `npm run verify:domains` then open https://advanciapayledger.com, https://advancia-healthcare.com, https://advanciapayroll.com (should redirect).

---

## 2. Auth (Supabase + Google)

| Done | Task | Where | Notes |
|------|------|--------|------|
| [ ] | Add all app **Redirect URLs** | **Supabase** → Authentication → URL Configuration → Redirect URLs | Add: `https://advanciapayledger.com/auth/callback`, `https://www.advanciapayledger.com/auth/callback`, `https://advancia-healthcare.com/auth/callback`, `https://www.advancia-healthcare.com/auth/callback`, `http://localhost:5173/auth/callback` (and 5174 if you use healthcare script). |
| [ ] | Set **Site URL** | Same page | e.g. `https://advanciapayledger.com` |
| [ ] | Add **Authorized JavaScript origins** | **Google Cloud Console** → APIs & Services → Credentials → your OAuth 2.0 Client ID | Same list as domains above (no /auth/callback in origins). |
| [ ] | Add **Authorized redirect URIs** | Same OAuth client | Add Supabase callback, e.g. `https://<project-ref>.supabase.co/auth/v1/callback`; app callbacks are handled by Supabase. |

**Verify:** Log in with email and (if configured) Google on both PayLedger and Healthcare domains; no CORS errors.

---

## 3. Email

| Done | Task | Where | Notes |
|------|------|--------|------|
| [ ] | Configure **support@** for advanciapayledger.com and advancia-healthcare.com | **Cloudflare** Email Routing (or your DNS/email provider) | Forward or mailbox. See [EXTRA_EMAILS_SETUP.md](EXTRA_EMAILS_SETUP.md) for more addresses. |

---

## 4. VPS (production API)

| Done | Task | Where | Notes |
|------|------|--------|------|
| [ ] | Set **.env** on VPS | **Hostinger VPS** (api.advanciapayledger.com), e.g. `/var/www/advancia/.env` | Include: `FRONTEND_URL`, `CORS_ORIGINS` (both domains), Supabase URL/keys, Stripe keys, Resend, Twilio, Redis/Upstash, Sentry, `STRIPE_WEBHOOK_SECRET`. See `.env.example` and [INFRASTRUCTURE_AND_DOMAINS.md](INFRASTRUCTURE_AND_DOMAINS.md). |

**Verify:** `curl -s https://api.advanciapayledger.com/health | jq`

---

## 5. Cloudflare security (recommended)

| Done | Task | Where | Notes |
|------|------|--------|------|
| [ ] | SSL/TLS → **Full (Strict)** | Cloudflare → SSL/TLS → Overview | |
| [ ] | **Bot Fight Mode** → On | Cloudflare → Security → Settings | |
| [ ] | **Rate limiting** rules | Cloudflare → Security → WAF (or Rate limiting) | Optional but recommended. |

---

## 6. Optional / later

- **Staging:** [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md) — staging API is already deployed; finish env/webhooks if you use it.
- **Extra emails:** enterprise@, privacy@, etc. — [EXTRA_EMAILS_SETUP.md](EXTRA_EMAILS_SETUP.md).
- **DMARC:** Add TXT `_dmarc` when convenient — [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md).
- **Full go-live:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md), [LAUNCH_RUNBOOK.md](LAUNCH_RUNBOOK.md).

---

## Quick reference

- **Full details (copy-paste URLs, env, DMARC):** [MANUAL_STEPS_DETAILS.md](MANUAL_STEPS_DETAILS.md)
- **One-page “what’s needed”:** [WHATS_NEEDED.md](WHATS_NEEDED.md)
- **Domain roles and OAuth:** [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md)
- **Domain & branding:** [DOMAIN_AND_BRANDING_CHECKLIST.md](DOMAIN_AND_BRANDING_CHECKLIST.md)
