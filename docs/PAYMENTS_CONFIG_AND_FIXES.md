# Payments config — what’s right, what’s wrong, and what to fix

Summary of Stripe/payment setup and the main corrections needed. No extra “plugin” is required beyond the Stripe React libraries you already use.

---

## 1. What’s in place and correct

### Stripe backend
- **Env:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` validated in `src/config/env.ts`.
- **API version:** `2026-02-25.clover` in `src/services/stripe.service.ts` — valid Stripe version.
- **Webhook:** Raw body for `POST /api/v1/stripe/webhook`; CSRF excluded; signature verification; `stripe-webhooks.service.ts` handles payment_intent, charge, subscription, invoice, Connect, etc.
- **Circuit breaker:** Stripe calls go through `stripeBreaker` (except `webhooks.constructEvent`).
- **Connect:** Provider onboarding and account links in `src/routes/connect.routes.ts`.

### Stripe frontend
- **Libs:** `@stripe/stripe-js`, `@stripe/react-stripe-js` — official Stripe React integration.
- **Usage:** `PaymentElement` + `Elements` in CheckoutPage, PaymentForm, Appointments (card collection). Singleton `stripePromise` in `frontend/src/lib/stripe.ts`.
- **Key:** `VITE_STRIPE_PUBLISHABLE_KEY`; fallback `pk_test_placeholder` in code (dev only).

### Nginx / proxy
- Stripe webhook path fixed to `/api/v1/stripe/webhook` in `config/nginx/advancia.conf` (previously pointed at `/stripe/webhook`).

---

## 2. What’s wrong and should be corrected

### 1) Withdrawal flow uses the wrong API and schema (high)

**Current behavior**
- **Frontend** (`frontend/src/pages/Withdraw.tsx`) submits withdrawal as:
  - `POST /api/v1/transactions` with body: `{ type: 'crypto_withdrawal' | 'bank_withdrawal', amount, currency, walletId?, bankDetails?, status: 'pending' }`.
- **Backend** (`src/server.ts`) calls `apiServices.transactionsService.create(req.body)` and inserts that body into the **transactions** table.

**Problem**
- The **transactions** table is for Stripe payments (patient_id, provider_id, amount, currency, payment_status, stripe_payment_intent_id, etc.). It does **not** have columns: `type`, `walletId`, `bankDetails`, or `status` (it has `payment_status`). So:
  - Either the insert fails (unknown columns), or
  - Supabase drops unknown columns and you get a row with only amount/currency and no patient_id/provider_id, which is misleading and not a real withdrawal record.

**Correct approach**
- **Crypto:** Use the **crypto_withdrawals** table (migration 048): `user_id`, `amount`, `currency`, `status`, `destination_address`, `tx_hash`. Add an API, e.g. `POST /api/v1/wallet/withdraw` or `POST /api/v1/withdrawals`, that:
  - Validates the user and linked wallet (or destination address).
  - Maps frontend payload to `crypto_withdrawals` (and sets `user_id` from auth).
- **Bank:** Either a dedicated table (e.g. `bank_withdrawal_requests`) or a generic “withdrawal_requests” table with type + metadata, and a dedicated endpoint that writes there instead of `transactions`.
- **Frontend:** Call the new withdrawal endpoint(s) instead of `POST /transactions`. Stop sending withdrawal-specific payloads to `POST /transactions`.

### 2) No validation or mapping on POST /transactions (medium)

- `POST /api/v1/transactions` passes `req.body` straight into `transactionsService.create(transaction)` and then Supabase `insert(transaction)`.
- There is no schema validation (e.g. Zod), no mapping from API shape to DB columns, and no check that the authenticated user is the patient or provider for the transaction. So:
  - Withdrawal payloads are wrong for this table (see above).
  - Any client could send arbitrary fields; Supabase may reject or ignore them, but the intent of the endpoint is unclear.

**Fix**
- Reserve `POST /transactions` for **Stripe-driven** transaction creation (e.g. from your own server-side payment flow), with a strict body schema and `patient_id` / `provider_id` from auth or server logic.
- Do **not** use `POST /transactions` for user-initiated withdrawal requests. Use the dedicated withdrawal endpoint(s) and tables above.

### 3) Production Stripe keys and publishable key (medium)

- **Backend:** Must use live keys (`sk_live_*`, `whsec_*` for webhook) in production; already documented in `.env.example` and production checklists.
- **Frontend:** In production build (e.g. Cloudflare Pages), **VITE_STRIPE_PUBLISHABLE_KEY** must be set to your **live** publishable key (`pk_live_*`). If it’s missing or still `pk_test_placeholder`, Stripe.js will be in test mode or fail. Add this to the deployment checklist and env docs.

### 4) Stripe webhook secret per environment (low)

- Use a **separate** webhook secret for staging vs production (different Stripe webhook endpoints or different Stripe projects). Document in STAGING_COMPLETION_RUNBOOK and PRODUCTION_CHECKLIST so each environment has the correct `STRIPE_WEBHOOK_SECRET`.

---

## 3. Plugin recommendation

**No additional payment “plugin” is recommended.**

- You already use the **official** Stripe React stack: `@stripe/stripe-js` + `@stripe/react-stripe-js` with **Elements** and **PaymentElement**. This is the recommended way to collect card and other payment methods in a React app.
- Adding a third-party “Stripe plugin” on top would duplicate behavior and can complicate upgrades and security. Stick with:
  - Backend: `stripe` (Node) + your existing webhook and Connect code.
  - Frontend: `loadStripe` + `Elements` + `PaymentElement` (and Connect onboarding links where needed).

If you later add more payment methods (e.g. Link, SEPA, or other Stripe products), use Stripe’s own docs and SDK options rather than a generic “payment plugin.”

---

## 4. Summary checklist

| Item | Status | Action |
|------|--------|--------|
| Stripe env (backend) | OK | Keep; ensure production uses live keys + webhook secret. |
| Stripe webhook path (nginx) | Fixed | Already corrected to `/api/v1/stripe/webhook`. |
| Stripe frontend (Elements, PaymentElement) | OK | No plugin needed; keep current stack. |
| VITE_STRIPE_PUBLISHABLE_KEY in production | Risk | Set `pk_live_*` in Cloudflare Pages (and doc it). |
| Withdrawal via POST /transactions | Wrong | Add withdrawal endpoint(s); use `crypto_withdrawals` (and optionally bank table); point Withdraw.tsx at new API. |
| POST /transactions validation | Missing | Add strict schema and use only for Stripe-related transaction creation. |
| Webhook secret per env | Doc | Document separate secrets for staging vs prod. |

---

## 5. Suggested code changes (short)

1. **New endpoint:** e.g. `POST /api/v1/wallet/withdraw` (or under a dedicated `withdrawals` router) that:
   - Reads body: amount, currency, walletId (for crypto) or bank details (for bank).
   - Resolves `user_id` from auth and optionally validates linked wallet.
   - Inserts into `crypto_withdrawals` (crypto) or a bank-withdrawal table (bank); returns 201 with the created record.
2. **Withdraw.tsx:** Replace `api.post('/transactions', { ... })` with a call to the new withdrawal endpoint (e.g. `api.post('/wallet/withdraw', { ... })` or `api.post('/withdrawals', { ... })`).
3. **POST /transactions:** Add Zod (or similar) validation and restrict to fields that match the `transactions` table and your intended use (Stripe-only). Reject or ignore withdrawal-style payloads.
4. **Docs:** In PRODUCTION_CHECKLIST and frontend env example, state that production builds must set `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` and that staging/production use different Stripe webhook secrets.

Once these are done, payments config is in good shape and withdrawals are handled on the right tables and endpoints.
