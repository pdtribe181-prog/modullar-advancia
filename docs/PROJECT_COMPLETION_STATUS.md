# Project completion status

Quick reference for “everything working” — code, build, tests, and what you still do manually.

---

## Code & build (verified)

| Check | Status | Notes |
|-------|--------|--------|
| Backend build | ✅ | `npm run build` → `dist/server.js` + openapi.yaml |
| Frontend build | ✅ | `cd frontend && npm run build` → Vite production bundle |
| TypeScript (backend) | ✅ | `npm run typecheck` (config/tsconfig.json) |
| Lint | ✅ | No linter errors in `src` or `frontend/src` |
| No TODO/FIXME in src | ✅ | Clean of stray TODOs in backend/frontend |

---

## Tests

| Check | Command | Note |
|-------|--------|------|
| Unit tests | `npm test` | Requires `npm install` at repo root (Jest). Run from repo root. |
| E2E (Playwright) | `npm run test:e2e` or `npm run test:e2e:api` | Requires backend + frontend running (or CI). `npm run playwright:install` once for browsers. |
| Admin E2E | `npx playwright test e2e/admin.spec.ts` | Optional env: E2E_ADMIN_TOKEN, E2E_ADMIN_EMAIL/PASSWORD (see [ADMIN_AND_E2E_TESTING.md](ADMIN_AND_E2E_TESTING.md)). |

If `npm test` fails with “Cannot find module jest”, run **`npm install`** at the repo root.

---

## First-time / CI setup

1. **Repo root:** `npm install` then `npm run build` and `npm run typecheck`.
2. **Frontend:** `cd frontend && npm install && npm run build`.
3. **E2E:** `npm run playwright:install` (or `npx playwright install --with-deps`).
4. **Env:** Copy `.env.example` to `.env` and fill in values (never commit `.env`).

---

## Manual / external (you do these)

- **Infrastructure & domains (Vercel, VPS, Render, Supabase, three domains):** [INFRASTRUCTURE_AND_DOMAINS.md](INFRASTRUCTURE_AND_DOMAINS.md) — single map and **proceed** order (§8).
- **Domains & OAuth:** [DOMAIN_AND_BRANDING_CHECKLIST.md](DOMAIN_AND_BRANDING_CHECKLIST.md), [DOMAINS_AND_GOOGLE_OAUTH.md](DOMAINS_AND_GOOGLE_OAUTH.md).
- **Support & extra emails:** [EXTRA_EMAILS_SETUP.md](EXTRA_EMAILS_SETUP.md).
- **Staging:** [STAGING_COMPLETION_RUNBOOK.md](STAGING_COMPLETION_RUNBOOK.md).
- **Production go-live:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md), [LAUNCH_RUNBOOK.md](LAUNCH_RUNBOOK.md).
- **Open PRs:** [OPEN_PRS_TRIAGE.md](OPEN_PRS_TRIAGE.md).

---

## Summary

- **Codebase:** Builds and typechecks; no known code gaps for “everything working” in-repo.
- **Tests:** Pass once dependencies are installed (`npm install` at root and in frontend); E2E needs Playwright browsers and optional env for admin.
- **Complete the project:** Finish the manual steps above (domains, emails, staging, production checklist, PRs). The repo is ready for that.
