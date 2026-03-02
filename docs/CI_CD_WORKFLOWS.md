# CI/CD Pipelines & Workflows

Single reference for all GitHub Actions workflows: triggers, jobs, and required secrets.

---

## 1. Workflow overview

| Workflow | Trigger | Purpose |
|----------|---------|--------|
| **CI Pipeline** (`ci.yml`) | Push/PR to `main`, `develop` | Lint, backend tests, frontend tests, security scan, E2E (API), Docker build (main only) |
| **CI/CD Pipeline** (`ci-cd.yml`) | Manual (`workflow_dispatch`) | Full pipeline + deploy to Render staging |
| **Automated Testing** (`automated-testing.yml`) | Manual + weekly (Mon 02:30 UTC) | Extended: Node 20/22 matrix, coverage, frontend Vitest, E2E |
| **Security Scan** (`security-scan.yml`) | Push/PR to `main` + weekly (Mon 09:00 UTC) | npm audit, secret detection, license check |
| **CodeQL** (`codeql.yml`) | Push/PR to `main` + weekly (Sat 07:28 UTC) | Code scanning (JS/TS, Actions) |
| **Docker Publish** (`docker-publish.yml`) | Push to `main`/`develop`, tags `v*.*.*`, PR to `main` | Build/push image to GHCR; PR = validate only |
| **Playwright Nightly** (`playwright-nightly.yml`) | Nightly (03:30 UTC) + manual | Full Playwright E2E suite |

---

## 2. CI Pipeline (`ci.yml`) — main PR/push pipeline

**Runs on:** `push` to `main`/`develop`, `pull_request` to `main`.

| Job | Runs after | What it does |
|-----|------------|--------------|
| **Lint** | — | `npm ci`, `npm run lint` (ESLint) |
| **Backend Tests** | Lint | typecheck, `npm run test:coverage`, build; uploads coverage artifact |
| **Frontend Tests** | Lint | frontend: typecheck, `npm run test:run` (Vitest), build with prod-like env |
| **Security Scan** | — | `npm audit --omit=dev`, grep for hardcoded Stripe/AWS-style secrets in `src/` |
| **E2E Tests (API)** | Backend Tests | Playwright API tests (`test:e2e:api`), Chromium only; uploads report |
| **Docker Build** | Backend Tests | Only on **push to main**: build Docker image (no push) |

**Secrets (optional for tests):** `SUPABASE_*`, `STRIPE_*` — fallbacks to placeholders if unset.

**Node:** 20.

---

## 3. CI/CD Pipeline (`ci-cd.yml`) — manual full pipeline + deploy

**Runs on:** `workflow_dispatch` only (Actions tab → Run workflow).

| Job | Runs after | What it does |
|-----|------------|--------------|
| Lint & Type Check | — | lint, typecheck, `format:check` |
| Backend Tests | Lint | `npm run test:coverage` (fixed placeholders) |
| Frontend Tests | Lint | frontend typecheck, Vitest, build |
| Build | Backend + Frontend tests | `npm run build`, upload `dist/` artifact |
| **Deploy to Render (Staging)** | Build | POST to `RENDER_DEPLOY_HOOK_URL` (uses **staging** environment) |

**Secrets:** Uses **staging** environment; needs `RENDER_DEPLOY_HOOK_URL` (or `RENDER_STAGING_DEPLOY_HOOK_URL` per SECRETS_SETUP).  
**Node:** 22 (differs from ci.yml’s 20).

---

## 4. Automated Testing (`automated-testing.yml`) — extended matrix

**Runs on:** `workflow_dispatch`, schedule Mon 02:30 UTC.

| Job | What it does |
|-----|--------------|
| **Unit Tests** | Matrix Node 20 & 22; `npm test -- --forceExit` |
| **Test Coverage** | Node 20; `npm run test:coverage`; upload to Codecov (optional `CODECOV_TOKEN`), artifact |
| **Frontend Tests** | Vitest in `frontend/` |
| **E2E (Playwright API)** | After unit + frontend; `test:e2e:api` with Chromium |
| **All Tests Passed** | Gate: fails if any of unit-tests, coverage, frontend-tests failed |

---

## 5. Security Scan (`security-scan.yml`)

**Runs on:** push/PR to `main`, schedule Mon 09:00 UTC.

| Job | What it does |
|-----|--------------|
| **npm Audit** | Backend and frontend `npm audit --audit-level=high`; `npm outdated` (informational) |
| **Secret Detection** | Grep for Stripe live keys, AWS keys, passwords, JWT-like strings; block if `.env` committed |
| **License Check** | `license-checker` with allowlist (MIT, ISC, BSD, Apache-2.0, etc.) — `continue-on-error` |

---

## 6. CodeQL (`codeql.yml`)

**Runs on:** push/PR to `main`, schedule Sat 07:28 UTC.

- **Languages:** `javascript-typescript`, `actions`.
- **Build:** none (no compile step).
- **Output:** Code scanning alerts in Security tab.

---

## 7. Docker Publish (`docker-publish.yml`)

**Runs on:** push to `main`/`develop`, push tags `v*.*.*`, PR to `main`.

| Event | Behavior |
|-------|----------|
| **PR to main** | Build only (no push), validate Dockerfile |
| **Push to main** | Build + push to `ghcr.io/<repo>`, tags: `latest`, `sha-<sha>`; provenance + SBOM |
| **Push to develop** | Build + push, tag: `latest-dev` |
| **Push tag v*.*.*** | Build + push, tags: version, major.minor, major |

**Platforms:** `linux/amd64`, `linux/arm64`.

---

## 8. Playwright Nightly (`playwright-nightly.yml`)

**Runs on:** schedule 03:30 UTC daily, `workflow_dispatch`.

- Installs backend + frontend deps, Playwright with all browsers.
- Runs **full** `npm run test:e2e` (not just API).
- Uploads Playwright report artifact (14 days).

---

## 9. Required secrets & environments

| Where | Secret / env | Used by |
|-------|----------------|--------|
| **Repo secrets** | `CODECOV_TOKEN` (optional) | automated-testing (coverage upload) |
| **Repo secrets** | `SUPABASE_*`, `STRIPE_*` (optional; placeholders used otherwise) | ci, automated-testing, playwright-nightly |
| **Environment: staging** | `RENDER_DEPLOY_HOOK_URL` or `RENDER_STAGING_DEPLOY_HOOK_URL` | ci-cd (deploy job) |
| **Environment: staging** | Supabase, Stripe (test), JWT_SECRET, RESEND, etc. | See [.github/SECRETS_SETUP.md](../.github/SECRETS_SETUP.md) |
| **Environment: production** | Supabase, Stripe (live), Render hook, Sentry, Twilio, etc. | See SECRETS_SETUP.md |

Full list: **[.github/SECRETS_SETUP.md](../.github/SECRETS_SETUP.md)** and **[.github/ENVIRONMENTS.md](../.github/ENVIRONMENTS.md)**.

---

## 10. Branch / PR behavior summary

| Branch / event | CI | Docker Publish | Security Scan | CodeQL | Deploy |
|----------------|----|----------------|----------------|--------|--------|
| **PR → main** | ✅ Full (lint, backend, frontend, security, E2E, Docker build) | ✅ Validate only | ✅ | ✅ | — |
| **Push to main** | ✅ Full | ✅ Build + push `latest` | ✅ | ✅ | — (ci-cd is manual) |
| **Push to develop** | ✅ Full | ✅ Build + push `latest-dev` | — | — | — |
| **Tag v*.*.*** | — | ✅ Build + push version tags | — | — | — |
| **Manual: CI/CD** | — | — | — | — | ✅ Staging deploy |

---

## 11. Notes

- **Node versions:** `ci.yml` and most workflows use **Node 20**; `ci-cd.yml` uses **Node 22**. Consider aligning to 20 if you rely on `engines` in package.json.
- **Frontend tests:** CI expects `frontend` to have `npm run test:run` (Vitest) and `npx tsc --noEmit`; both exist.
- **E2E:** API-only E2E runs in CI; full browser E2E runs in Playwright Nightly and optionally in Automated Testing.
- **Deploy:** Production API is on **VPS** (see [INFRASTRUCTURE_AND_DOMAINS.md](INFRASTRUCTURE_AND_DOMAINS.md)); Render deploy hook in CI/CD is for **staging** only.
