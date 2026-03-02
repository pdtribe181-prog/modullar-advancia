# What’s needed — short list

One-place checklist of **manual / infra** items. Code and CORS are done in the repo.

---

## Must-do (production)

| # | What | Where |
|---|------|--------|
| 1 | Add **advancia-healthcare.com** (and optional www) as custom domain | **Cloudflare Pages** → same project as PayLedger |
| 2 | 301 redirect **advanciapayroll.com** and www → advanciapayledger.com | **Hostinger** → Websites → Redirects |
| 3 | Add all app callback URLs (payledger, www, healthcare, www, localhost) | **Supabase** → Authentication → URL Configuration → Redirect URLs |
| 4 | Add all app origins (same list) | **Google Cloud Console** → OAuth client → Authorized JavaScript origins |
| 5 | Configure **support@** for advanciapayledger.com and advancia-healthcare.com | Email routing / forwarding (e.g. Cloudflare Email Routing) |
| 6 | VPS `.env`: `FRONTEND_URL`, Supabase, Stripe, optional `CORS_ORIGINS` | **Hostinger VPS** (api.advanciapayledger.com) |

---

## Verify after

- `npm run verify:domains` (DNS for all three domains)
- Open https://advanciapayledger.com and https://advancia-healthcare.com → login works, no CORS errors
- Open https://advanciapayroll.com → redirects to https://advanciapayledger.com

---

## Optional / later

- **Staging:** Supabase staging project, Render env, webhooks (see STAGING_COMPLETION_RUNBOOK.md)
- **Extra emails:** enterprise@, privacy@, security@, etc. (see EXTRA_EMAILS_SETUP.md)
- **Payments:** Withdrawal endpoint and validation (see PAYMENTS_CONFIG_AND_FIXES.md)

---

## Repos (for reference)

- **This repo (modullar-advancia):** PayLedger + Healthcare → advanciapayledger.com, advancia-healthcare.com. **This is the only deploy source for production.**
- **Payroll:** Leave as redirect only. advanciapayroll.com (Hostinger) 301 → advanciapayledger.com. Do not serve the payroll repo (advancia-healthcare1) on that domain; no active payroll app.
- **productution / modular-saas-platform-nw:** Different bundle (Next.js, microservices, Prisma/Neon). Use as reference only; do not deploy to the live domains.

Details: [INFRASTRUCTURE_AND_DOMAINS.md](INFRASTRUCTURE_AND_DOMAINS.md), [DOMAIN_AND_BRANDING_CHECKLIST.md](DOMAIN_AND_BRANDING_CHECKLIST.md), [REPO_MAP.md](REPO_MAP.md).
