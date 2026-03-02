# Stripe, blockchains, withdrawal, onboarding, user journey, backup, rules, MCP, Neon

Single reference for Stripe config, blockchain/wallet (ETH/BTC/USDT), withdrawal flow, onboarding, user journey, backup, Cursor rules/MCP, and Neon usage.

---

## 1. Stripe config

**Env (required):** Validated in `src/config/env.ts`.

| Variable | Validation | Use |
|----------|-------------|-----|
| `STRIPE_SECRET_KEY` | Must start with `sk_` | Server-side Stripe API (payments, Connect, webhooks) |
| `STRIPE_PUBLISHABLE_KEY` | Must start with `pk_` | Frontend Stripe.js / Elements |
| `STRIPE_WEBHOOK_SECRET` | Must start with `whsec_` | Verify webhook signatures at `POST /api/v1/stripe/webhook` |

**Code:** `src/services/stripe.service.ts` (Stripe client, Connect, payment intents, customers, webhook handling), `src/routes/stripe.routes.ts`, `src/routes/connect.routes.ts`, `src/services/stripe-webhooks.service.ts`. CSRF excludes `/api/v1/stripe/webhook` in `src/middleware/csrf.middleware.ts`.

**Docs:** `.env.example`, `docs/PRODUCTION_CHECKLIST.md`, `docs/PRODUCTION_STATUS.md`.

---

## 2. Blockchains (ETH, BTC, USDT, etc.)

**Backend**

- **Networks:** `src/services/wallet.service.ts` and `src/routes/wallet.routes.ts` support **ethereum**, **solana**, **polygon**, **base**, **arbitrum** (no Bitcoin network in backend; wallet linking uses Ethers and Solana-style verification).
- **Payout currencies:** `wallet.routes.ts` allows **USDC, USDT, ETH, SOL** for `payout_currency` on linked wallets.
- **Wallet linking:** Challenge/verify flow with `ethers` (EVM) and `tweetnacl`/`bs58` (Solana). Tables: `wallet_verification_challenges`, `linked_wallets`, `wallet_transactions`.

**Frontend**

- **CryptoWallet / Convert / Withdraw:** UI shows **BTC, ETH, SOL, USDC, USDT** (and MATIC in Convert). Withdraw page options: USDC, USDT, ETH, SOL. CryptoWallet mock balances include BTC.
- **Docs/FAQ:** Mention BTC, ETH, USDC, USDT, SOL as supported.

**Gap:** Backend `BlockchainNetwork` does not include `bitcoin`; only EVM + Solana. BTC appears in UI and docs; actual BTC payouts would require backend support for a Bitcoin network/wallet type.

---

## 3. Withdrawal flow

**Backend**

- **Linked wallets:** `GET /api/v1/wallet/list`, `PATCH /api/v1/wallet/:id` (e.g. `payoutEnabled`, `minPayoutAmount`, `payoutCurrency`: USDC, USDT, ETH, SOL).
- **Transactions:** `GET /api/v1/wallet/transactions`, `GET /api/v1/wallet/transactions/:id` (provider payout/refund history).
- **No direct “withdraw” endpoint:** Withdrawal is modeled as a transaction/support flow.

**Frontend**

- **`frontend/src/pages/Withdraw.tsx`:** Method: **crypto** (linked wallet + amount + currency: USDC/USDT/ETH/SOL) or **bank** (ACH). On confirm, calls `POST /transactions` with `type: 'crypto_withdrawal' | 'bank_withdrawal'`, amount, currency, `walletId` or bank details. Treated as a pending request (support/compliance).

**Database:** `wallet_transactions` (and related) for crypto payouts; Stripe Connect for fiat payouts.

---

## 4. Onboarding

**Provider (Stripe Connect)**

- **Routes:** `src/routes/connect.routes.ts`: `POST /connect/account` (create Express account), `POST /connect/onboard` (account link for onboarding), `GET /connect/status`, `POST /connect/refresh`, etc.
- **Flow:** Create/link Stripe Connect Express account → redirect to Stripe onboarding → return URLs use `FRONTEND_URL` (e.g. `/provider/onboarding/refresh`, `/provider/onboarding/complete`).
- **Rate limit:** `onboardingLimiter` (env: `RATE_LIMIT_ONBOARDING_*`).
- **Frontend:** Provider dashboard shows “Complete Stripe onboarding”; link to `/connect/onboard` (or similar). See `frontend/src/pages/ProviderDashboard.tsx`, `docs/PROVIDER_GUIDE.md`.

**User (post-signup)**

- **Route:** `frontend/src/pages/Onboarding.tsx` at `/welcome` — steps: welcome, profile, preferences, etc. (no Stripe; general product onboarding).

---

## 5. User journey (high level)

1. **Sign up / Login** → Auth (Supabase), optional Google OAuth.
2. **Onboarding** → `/welcome` (Onboarding.tsx) for new users; providers also have Connect onboarding.
3. **Dashboard** → `/dashboard`; providers see Connect status and “Start Onboarding” if not connected.
4. **Payments** → Stripe (card); crypto via wallet/Convert/Withdraw UI (withdrawal as request flow).
5. **Wallet** → Link wallet (challenge/verify), set payout currency (USDC, USDT, ETH, SOL), view transactions.
6. **Withdraw** → Choose crypto (linked wallet + amount + USDC/USDT/ETH/SOL) or bank → submit as transaction request.

See also `docs/USER_GUIDE.md`, `docs/PROVIDER_GUIDE.md`, `docs/DOMAIN_ROUTER_AND_API.md` (routes).

---

## 6. Backup

**Docs:** `docs/BACKUP_RESTORATION.md`, `docs/DEPLOYMENT_RUNBOOK.md`, `docs/PRODUCTION_STATUS.md`.

| Component | Method | Notes |
|-----------|--------|-------|
| **Postgres (Supabase)** | Daily + PITR | Supabase Pro; 7-day retention. Manual: `pg_dump` / `supabase db dump`. |
| **Redis (Upstash)** | Upstash automated | Daily, 7 days. |
| **Code / secrets** | Git, password manager | Per checklist. |
| **VPS** | pg_dump cron | e.g. `/var/backups/advancia/`, restore via `psql`. |

**Schema:** `data_backup_logs`, `data_backup_schedules` in `DATABASE_SCHEMA.md` / migrations.

---

## 7. Rules & MCP

**Cursor rules**

- This **repo** (modullar-advancia) has **no** `.cursor/` directory and **no** `*.mdc` / rules files under the project. Branch protection and repo rules are in `docs` (e.g. `.github/BRANCH_PROTECTION.md`, `docs/PRODUCTION_CHECKLIST.md`).

**MCP (Model Context Protocol)**

- MCP config and tools (e.g. `cursor-ide-browser`, task/shell agents) live in **Cursor’s project/config** (e.g. under `.cursor/projects/.../mcps/`), not inside the modullar-advancia repo. This doc does not define MCP; it only notes that the codebase itself has no MCP or Cursor rules files.

**Other “rules” in repo**

- **Compliance / workflow:** `compliance_workflow_rules`, `fraud_detection_rules` (DB/migrations), RLS policies.
- **Rate limiting:** Env `RATE_LIMIT_*`; middleware in `src/middleware/rateLimit.middleware.ts`.
- **Validation:** e.g. `frontend/src/hooks/useFormValidation.ts` (validation rules for forms).

---

## 8. Neon

**Neon is not used in this repository.**

- **Searched:** All of modullar-advancia for `neon`, `neon.tech`, `NEON_`, `@neondatabase`, and (earlier) `DATABASE_URL` / `postgres://` in `src` — no Neon references.
- **Database:** **Supabase** (Postgres). Connection and auth via `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. No Neon driver or env vars.
- **Doc:** `docs/NETWORK_CONFIG_PROXIES_UPSTASH.md` states “This project does not use Neon.”

If you have another repo or a different workspace where Neon is used, that would be separate from this codebase.

---

## 9. Summary table

| Topic | Status / location |
|-------|-------------------|
| **Stripe config** | ✅ env: `STRIPE_*` in `src/config/env.ts`; routes & services in `src/routes/stripe.routes.ts`, `connect.routes.ts`, `src/services/stripe.service.ts`, `stripe-webhooks.service.ts`. |
| **Blockchains** | ✅ Backend: ethereum, solana, polygon, base, arbitrum (wallet linking). Payout currencies: USDC, USDT, ETH, SOL. Frontend: BTC/ETH/SOL/USDC/USDT in UI. |
| **Withdrawal flow** | ✅ Crypto (linked wallet + USDC/USDT/ETH/SOL) and bank via `Withdraw.tsx` → `POST /transactions`; wallet routes for list/settings/transactions. |
| **Onboarding** | ✅ Provider: Stripe Connect (`connect.routes.ts`, `/welcome`-style flows). User: Onboarding.tsx at `/welcome`. |
| **User journey** | ✅ Sign up → onboarding → dashboard → payments/wallet/withdraw; see USER_GUIDE, PROVIDER_GUIDE, DOMAIN_ROUTER_AND_API. |
| **Backup** | ✅ Supabase + Upstash + VPS pg_dump; see BACKUP_RESTORATION, DEPLOYMENT_RUNBOOK. |
| **Rules / MCP** | ✅ No `.cursor` or rules in repo; MCP is Cursor-level. Repo has compliance/RLS/validation “rules.” |
| **Neon** | ❌ Not used; DB is Supabase only. |
