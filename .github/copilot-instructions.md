# Modullar Advancia - Healthcare Payment Platform

## Project Overview

Healthcare payment and compliance management platform. Node.js/Express REST API (TypeScript) backed by Supabase (PostgreSQL), with a React/Vite frontend. Includes Stripe payments, Twilio SMS, Resend email, Redis rate-limiting, Sentry monitoring, and HIPAA-oriented Row Level Security.

## Tech Stack

- **Runtime**: Node.js 22.x (ESM, `"type": "module"`)
- **Backend**: Express 5, TypeScript 5, Zod validation
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Frontend**: React 19, Vite 7, Vitest, React Router 7
- **Payments**: Stripe (webhooks use raw body middleware)
- **Build tool**: esbuild (`esbuild.config.js`)
- **Testing**: Jest + ts-jest (backend unit), Vitest (frontend), Playwright (E2E/API)
- **Linting/Formatting**: ESLint (`eslint.config.mjs`), Prettier (`.prettierrc`)
- **Pre-commit**: Husky + lint-staged (runs eslint + prettier on staged `src/**/*.{ts,tsx}`)

## Project Structure

```
modullar-advancia/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── config/env.ts          # Zod-validated env vars (validateEnv, getEnv)
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client (anon + service role)
│   │   └── redis.ts           # Redis/Upstash helpers
│   ├── routes/                # Express routers (stripe, auth, appointments, etc.)
│   ├── controllers/           # Route handler logic
│   ├── services/              # Business logic (api.service.ts, monitoring.service.ts, etc.)
│   ├── middleware/            # auth, csrf, logging, rateLimit, sanitize, security, validation
│   ├── types/                 # Shared TypeScript types (express.types.ts, etc.)
│   └── utils/errors.ts        # AppError class, asyncHandler, sendErrorResponse
├── frontend/                  # React/Vite SPA (separate npm workspace)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── migrations/                # SQL migration files (001–011)
├── migrations-ready/          # Staged SQL files ready to apply
├── tests/                     # Playwright E2E test suites
├── e2e/                       # Additional E2E specs
├── src/__tests__/             # Jest unit tests (matched by jest.config.ts)
├── jest.config.ts
├── jest.setup.ts
├── playwright.config.ts
├── playwright.api.config.ts
├── tsconfig.json              # Dev tsconfig (ESNext, bundler resolution, outDir=dist)
├── tsconfig.build.json        # Build tsconfig
├── esbuild.config.js          # Production bundler config
├── eslint.config.mjs
├── openapi.yaml               # OpenAPI 3 spec (also copied to dist/ on build)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env` (never commit `.env`). Required keys:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL` (e.g. `http://localhost:5173`)
- `PORT` (default: 3000)
- Optional: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `REDIS_URL` / Upstash vars

In CI, environment variables are provided via GitHub Actions secrets with safe test-placeholder fallbacks (see `.github/workflows/ci.yml`).

## Development Commands (Backend — repo root)

Always run `npm install` first. All commands use Node 22.

```bash
npm install                   # Install dependencies
npm run dev                   # Start dev server with tsx --watch (src/server.ts)
npm run build                 # Production build via esbuild (outputs to dist/)
npm run build:prod            # Clean + build
npm start                     # Run compiled dist/server.js
npm run typecheck             # tsc --noEmit (uses tsconfig.json)
npm run typecheck:build       # tsc --noEmit -p tsconfig.build.json
npm run lint                  # ESLint on src/
npm run lint:fix              # ESLint --fix on src/
npm run format                # Prettier --write on src/**/*.ts
npm run format:check          # Prettier --check on src/**/*.ts
npm test                      # Jest unit tests (src/__tests__/**/*.test.ts)
npm run test:coverage         # Jest with coverage (min thresholds: 12% stmts/lines, 15% branches/functions)
npm run test:e2e:api          # Playwright API E2E tests (playwright.api.config.ts)
npm run test:e2e              # Playwright full E2E tests (playwright.config.ts)
npm run test:connection       # tsx test-connection.ts (requires real Supabase creds)
```

**Important**: Jest tests require these env vars (use test placeholders if no real Supabase):

```
NODE_ENV=test
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key
STRIPE_SECRET_KEY=sk_test_placeholder00000000000000
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder00000000000000
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder
FRONTEND_URL=http://localhost:5173
```

**Notes**:

- Jest uses `--experimental-vm-modules` (ESM). Config is in `jest.config.ts`.
- `e2e.test.ts` and `api.test.ts` are excluded from the Jest run (they need a running server).
- The `postbuild` script copies `openapi.yaml` to `dist/`. Build fails if this step errors.
- TypeScript path aliases are not used; imports use relative paths with `.js` extensions.

## Development Commands (Frontend — `frontend/` directory)

```bash
cd frontend
npm install
npm run dev            # Vite dev server on localhost:5173
npm run build          # tsc + vite build
npm run test:run       # Vitest run (no watch)
npm run test:coverage  # Vitest coverage
```

Frontend requires these env vars (in `frontend/.env` or CI):

- `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## CI Pipeline (`.github/workflows/ci.yml`)

On push to `main`/`develop` and PRs to `main`:

1. **Lint** — `npm run lint`
2. **Backend Tests** (needs lint) — typecheck, `npm run test:coverage -- --ci --forceExit`, then `npm run build`
3. **Frontend Tests** (needs lint) — typecheck, `npm run test:run`, then `npm run build`
4. **Security Scan** — `npm audit --omit=dev --audit-level=high`, secret pattern grep on `src/`
5. **E2E API Tests** (needs backend) — Playwright with chromium, `npm run test:e2e:api`
6. **Docker Build** (needs backend, main push only) — builds image, does not push

All jobs run on `ubuntu-latest` with Node 22. Cancels in-progress runs on new pushes.

## Key Architecture Notes

- **API base path**: `/api/v1` — all business routes live under this prefix
- **Auth**: Bearer token validated via `supabase.auth.getUser(token)`; user profile fetched from `user_profiles` table for role-based access
- **Roles**: `admin`, `provider`, patient (default) — controls data visibility in many routes
- **Stripe webhooks**: Use raw body (`express.raw`) at `/api/v1/stripe/webhook`; all other routes use `express.json`
- **CSRF**: Applied to all `/api/v1` state-changing requests; webhooks use signature verification instead
- **Error handling**: Use `asyncHandler` wrapper + `AppError` class from `src/utils/errors.ts`; global handler in `src/middleware/logging.middleware.ts`
- **Param validation**: Use `validateParams(zodSchema)` middleware from `src/middleware/validation.middleware.ts`
- **Database**: 80+ tables. Key tables: `user_profiles`, `patients`, `providers`, `appointments`, `transactions`, `invoices`, `disputes`, `notifications`, `api_keys`, `webhooks`, `compliance_logs`
- **RLS**: Row Level Security policies defined in `migrations/011_row_level_security.sql`
- **Imports**: Always use `.js` extension in TypeScript source imports (ESM with bundler resolution)

## Testing Approach

- Unit tests: `src/__tests__/` — mock Supabase, Stripe, Redis; do not need running server
- E2E/API tests: `tests/` and `e2e/` — require running server and real or test credentials
- New tests go in `src/__tests__/` as `*.test.ts`; follow existing patterns in that directory

## Security Checklist for Code Changes

- Never commit real secrets; use env vars
- Stripe/AWS secret keys are scanned by CI using pattern `sk_(live|test)_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}` in `src/` — matches will fail the build
- New routes must use `asyncHandler` and appropriate auth/rate-limit middleware
- Validate all path params with `validateParams` + Zod schemas
- Whitelist request body fields before passing to Supabase (prevent mass assignment)
