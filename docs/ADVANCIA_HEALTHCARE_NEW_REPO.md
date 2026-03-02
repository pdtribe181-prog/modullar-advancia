# Advancia Healthcare — full project in a new repo (clean workspace)

One codebase has **everything**: one landing, wallet connect, booking/sessions, features, FAQ, policies, subscriptions, admin, login, loaders. This doc is the checklist (nothing missing) and the steps for **[pdtribe181-prog/Advancia-Healthcare-main1](https://github.com/pdtribe181-prog/Advancia-Healthcare-main1)** (or any new repo).

---

## 1. Feature checklist — nothing missing

This repo (modullar-advancia) already includes all of the following. Use this list to confirm when you create the new repo.

### Frontend routes & features

| Route / area | Feature | In codebase |
|--------------|---------|-------------|
| `/` | Landing (PayLedger or Healthcare by host) | ✅ `LandingPage` / `HealthcareLanding` |
| `/features` | Features page | ✅ |
| `/policy` | Privacy policy | ✅ |
| `/subscriptions` | Subscriptions | ✅ |
| `/wallet-tools` | Crypto wallet tools | ✅ `CryptoWallet` |
| `/faq` | FAQ | ✅ |
| `/contact` | Contact | ✅ |
| `/login`, `/signup` | Auth | ✅ |
| `/payment`, `/checkout`, `/payment/success` | Payments (Stripe) | ✅ |
| `/dashboard` | User dashboard | ✅ |
| `/history` | Payment history | ✅ |
| `/profile` | Profile | ✅ |
| `/appointments` | Appointments (patient) | ✅ |
| `/provider` | Provider dashboard | ✅ |
| `/wallet` | Wallet connect | ✅ `WalletConnect` |
| `/wallet-balance` | Wallet balance | ✅ `WalletBalance` |
| `/withdraw` | Withdraw (crypto/bank) | ✅ `Withdraw` |
| `/convert` | Convert | ✅ `Convert` |
| `/medbed` | MedBed | ✅ `MedBed` |
| `/notifications` | Notifications | ✅ `Notifications` |
| `/invoices` | Invoices | ✅ |
| `/disputes` | Disputes | ✅ |
| `/kyc` | KYC verification | ✅ |
| `/security`, `/security/mfa`, `/security/2fa-setup` | Security & MFA | ✅ |
| `/admin`, `/admin/audit-log` | Admin console | ✅ |
| `/terms`, `/verify-email`, `/welcome` | Legal & onboarding | ✅ |

### Backend (API)

- Auth (Supabase): signup, login, callback, password reset, MFA
- Appointments, providers, patients
- Transactions, payments (Stripe), refunds
- Invoices, disputes
- Admin: users, transactions, disputes, webhooks
- Connect (Stripe Connect for providers)
- Health, docs (Swagger)
- Wallets / withdraw (transactions; see PAYMENTS_CONFIG_AND_FIXES.md for recommended withdrawal endpoint)

### Domains & branding

- **advanciapayledger.com** → PayLedger landing + full app
- **advancia-healthcare.com** → Healthcare landing + **same full app** (wallets, MedBeds, withdraw, etc.)
- **advanciapayroll.com** → Leave as redirect only (301 → payledger)
- Config: `frontend/src/config/domains.ts` (`isHealthcareHost`, `getSupportEmail`, `SIGNUP_ORIGIN`)

So: **Healthcare already has the full app**; only the landing and support email change by host. Nothing is missing for a “full advancia-healthcare” experience.

---

## 2. Create new repo — clean workspace (steps)

You said you will create the new repo. Do this in order.

### Step 1: Create the new repo on GitHub

- Create a **new empty repository** (e.g. `advancia-healthcare` or `advancia-unified`).
- Do **not** add a README, .gitignore, or license (so you can push the full codebase).

### Step 2: Clean workspace from this codebase (mirror)

**For [Advancia-Healthcare-main1](https://github.com/pdtribe181-prog/Advancia-Healthcare-main1) (one landing, all routes, ports 5174/3001, no conflict):**

From **modullar-advancia** repo root:

```powershell
.\scripts\prepare-advancia-healthcare-main1.ps1 -TargetDir "..\Advancia-Healthcare-main1"
cd ..\Advancia-Healthcare-main1
npm install
cd frontend
npm install
cd ..
copy .env.example .env
# Edit .env: set PORT=3001, Supabase, Stripe, etc.
npm run dev
# In another terminal: cd frontend && npm run dev  → app at http://127.0.0.1:5174
git init
git add -A
git commit -m "Advancia Healthcare full app"
git remote add origin https://github.com/pdtribe181-prog/Advancia-Healthcare-main1.git
git branch -M main
git push -u origin main
```

The script copies the full app, sets **healthcare-only** branding (single landing, support@advancia-healthcare.com), **frontend port 5174**, **backend port 3001**, and a README. No port conflict with modullar-advancia (5173/3000).

**Option B — Clone canonical and point to your new repo (other names)**

```powershell
# 1. Clone modullar-advancia into the new workspace folder
cd C:\Users\mucha.DESKTOP-H7T9NPM
git clone https://github.com/pdtribe181-prog/modullar-advancia.git advancia-healthcare
cd advancia-healthcare

# 2. Remove the old remote and add your new repo
git remote remove origin
git remote add origin https://github.com/YOUR_ORG/advancia-healthcare.git

# 3. (Optional) Rename branch if you want
# git branch -M main

# 4. Push everything to the new repo
git push -u origin main
```

**Option B — Copy from current workspace (if you're already in modullar-advancia)**

```powershell
# 1. Create new folder and copy repo (excluding node_modules, .git)
cd C:\Users\mucha.DESKTOP-H7T9NPM
mkdir advancia-healthcare
cd modullar-advancia
git archive main | tar -x -C ..\advancia-healthcare

# 2. In the new folder, init git and add your new repo
cd ..\advancia-healthcare
git init
git add -A
git commit -m "Initial: full PayLedger + Healthcare (mirror modullar-advancia)"
git remote add origin https://github.com/YOUR_ORG/advancia-healthcare.git
git branch -M main
git push -u origin main
```

Replace `YOUR_ORG/advancia-healthcare` with your actual new repo URL (e.g. `advancia-devuser/advancia-healthcare`).

### Step 3: Install and verify in the new workspace

```powershell
cd C:\Users\mucha.DESKTOP-H7T9NPM\advancia-healthcare
npm install
cd frontend
npm install
cd ..
npm run build
npm test
```

If build and tests pass, the clean workspace has everything.

### Step 4: Deploy (when ready)

- **Frontend:** Connect the new repo to Cloudflare Pages (or Hostinger/Vercel). Use same env (e.g. `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_*`). Add custom domains: advanciapayledger.com, advancia-healthcare.com.
- **API:** Keep using the same Hostinger VPS API (api.advanciapayledger.com) or point to a new API if you deploy the backend from this new repo.
- **Docs:** WHATS_NEEDED.md, INFRASTRUCTURE_AND_DOMAINS.md, DOMAIN_AND_BRANDING_CHECKLIST.md stay valid; only the “canonical repo” URL changes if you make this new repo the main one.

---

## 3. “All together” in one codebase

- **One app** serves both brands: host decides landing (Healthcare vs PayLedger) and support email; all routes (wallets, MedBeds, withdraw, appointments, etc.) are shared.
- **One backend** (Node/Express, Supabase, Stripe) for both.
- **Nothing missing** for Healthcare: when users use advancia-healthcare.com they get the same dashboard, wallet, MedBed, withdraw, appointments, and every other feature.

If you later want **two separate frontend apps** (e.g. `apps/payledger` and `apps/healthcare` in a monorepo), you can split the frontend into two Vite apps that share components and routes; the feature list above stays the same.

---

## 4. Quick reference

| Item | Where |
|------|--------|
| Feature list (nothing missing) | §1 above |
| New repo steps | §2 above |
| Domain config | `frontend/src/config/domains.ts` |
| Infra & domains | [INFRASTRUCTURE_AND_DOMAINS.md](INFRASTRUCTURE_AND_DOMAINS.md) |
| What’s needed (manual) | [WHATS_NEEDED.md](WHATS_NEEDED.md) |
| Repos map | [REPO_MAP.md](REPO_MAP.md) |
