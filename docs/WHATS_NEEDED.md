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

## After you add the CNAME

1. **Host (Cloudflare Pages / Vercel):** Add the custom domain in the project (Custom domains / Domains). SSL is provisioned automatically.
2. **Backend CORS:** If the new domain calls the API, add it to `CORS_ORIGINS` on the VPS (or it may already be in code for payledger/healthcare).
3. **Supabase:** Authentication → URL configuration → add Site URL and Redirect URLs for the new domain.
4. **Google OAuth:** Add the domain to Authorized JavaScript origins and redirect URIs.
5. **Verify:** Run `npm run verify:dns`; open the URL in a browser and test login.

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
