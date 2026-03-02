## Modullar Advancia Architecture

This document gives a high-level overview of how the healthcare payment and compliance platform is structured in this project directory.

### Domains & products (recommended mapping)

- **advanciapayledger.com**: B2B healthcare payments product **Advancia PayLedger** (marketing site + web app).
- **app.advanciapayledger.com**: Application hostname (can serve the same app as the apex domain).
- **api.advanciapayledger.com**: Public API for the PayLedger platform (this backend, exposed under `/api/v1`).
- **advancia-healthcare.com**: Marketing site for the **Advancia Healthcare Wallet** + health cards/records module, which can link into the PayLedger app for authentication and account management.
- **advanciapayroll.com**: Legacy/alternate entry domain; recommended to 301 redirect to `advanciapayledger.com` unless a separate payroll product is built.

For **redirect rules**, **Google OAuth**, and **Supabase redirect URLs**, see **[docs/DOMAINS_AND_GOOGLE_OAUTH.md](docs/DOMAINS_AND_GOOGLE_OAUTH.md)**. For **router, API, navigation, and responsiveness** on all three domains, see **[docs/DOMAIN_ROUTER_AND_API.md](docs/DOMAIN_ROUTER_AND_API.md)**.

---

## Backend (Node / Express / TypeScript)

- **Tech stack**
  - Node 20, TypeScript 5, Express 5.
  - Jest + Playwright for testing.
  - ESLint + Prettier for code quality.

- **Entry point**
  - `src/server.ts` is the main Express API server.
  - On startup it:
    - Validates environment with `validateEnv` / `getEnv`.
    - Initializes monitoring (Sentry) via `initializeMonitoring`.
    - Creates the Express app and starts listening on `env.PORT`.
    - Loads an in-memory `serviceCatalog` and wires graceful shutdown to flush monitoring and stop background tasks.

- **Routing**
  - Feature routes are defined under `src/routes` and mounted from `src/server.ts`:
    - `stripe.routes.ts` – payment flows with Stripe.
    - `connect.routes.ts` – provider onboarding and external account linking.
    - `admin.routes.ts` – admin-only operations.
    - `auth.routes.ts` – authentication, sessions, MFA, reset flows.
    - `appointments.routes.ts` – appointment scheduling and management.
    - `provider.routes.ts` – provider-facing endpoints.
    - `wallet.routes.ts` – wallet balances and transfers.
    - `invoices.routes.ts` – invoices lifecycle.
    - `database-webhook.routes.ts` – database/webhook event ingestion.
    - `medbed.routes.ts` – MedBed-specific healthcare flows (uses `MedBedController`).
    - `upload.routes.ts` – validated file uploads to Supabase Storage.
    - `gdpr.routes.ts` / `retention.routes.ts` – GDPR and data retention operations.
    - `metrics.routes.ts` – Prometheus-style metrics endpoints.
    - `orchestration.routes.ts` – payment, notification, cache, and automation orchestration APIs.
    - `services.routes.ts` – medical service catalog CRUD and queries.

- **Middleware pipeline**
  - Implemented under `src/middleware` and registered in `src/server.ts`:
    - **Monitoring**: Sentry request and error handlers (`monitoring.service`).
    - **Request context**: `requestId`, `requestLogger`.
    - **Security**: `configureSecurityHeaders`, `getCorsConfig` (CORS allowlist with logging).
    - **Compression**: `compressionMiddleware`, `fastCompressionMiddleware`.
    - **Versioning**: `apiVersioning` sets `req.apiVersion` from URL, headers, or defaults.
    - **CSRF and sanitization**: `csrfProtection`, `sanitizeBody`.
    - **Rate limiting**: `apiLimiter`, `paymentLimiter`, and other lazy-initialized limiters using Redis if available.
    - **Audit log**: `auditLog` for compliance/security logging.
    - **Metrics**: `metricsMiddleware` for request metrics.
    - **Error handling**: centralized `errorHandler` and `notFoundHandler` after Sentry’s error handler.

- **Core services**
  - Located under `src/services`:
    - `payment-orchestration.service.ts` – complex payment flows with retries, state management, and metrics.
    - `notification-orchestration.service.ts` – multi-channel notification routing and retries.
    - `cache-orchestration.service.ts` – cache invalidation/warming orchestration.
    - `automation-orchestration.service.ts` – workflow engine for scheduled, event, condition, and manual flows.
    - `service-catalog.service.ts` – loads and serves medical service definitions.
    - `gdpr.service.ts` / `data-retention.service.ts` – GDPR operations and retention policies.
    - `monitoring.service.ts` – Sentry setup, user context, health checks, and flushing.
    - Other domain services (auth, wallet, Stripe, MedBed, security, metrics, SMS) encapsulate business logic used by the routes.

---

## Frontend (React / Vite / TypeScript)

- **Tech stack**
  - React 19, React Router, Vite 7, TypeScript.
  - Stripe integration via `@stripe/react-stripe-js` and `@stripe/stripe-js`.
  - Sentry via `@sentry/react`.
  - Charts via `recharts`.
  - Vitest + Testing Library for unit and component tests.

- **Structure**
  - Source lives in `frontend/src`:
    - `pages/` – route-level screens such as `Dashboard`, `LandingPage`, `MedBed`, `SecuritySettings`, `MFASetup`, `WalletBalance`, `PaymentPage`, etc.
    - `components/` – shared UI elements like `Spinner`, `Toast`, `PaymentForm`, `ConfirmDialog`, `ProtectedRoute`, and form inputs under `components/inputs`.
    - `providers/` – context-like providers such as `AuthProvider` and `StripeProvider`.
    - `hooks/` – custom hooks like `useApi` and `useFormValidation`.
    - `lib/` – integration helpers (e.g. Sentry and Stripe client setup).
    - `services/` – frontend API wrapper(s) for calling the backend.

- **Frontend–backend interaction**
  - Frontend pages/hooks call backend REST endpoints exposed under `/api/v1/...` (and `/metrics` for metrics) through the API service layer.
  - Authentication, payments, MedBed flows, uploads, GDPR actions, and orchestration features are driven by these API calls.

---

## Quality and tooling

- **Backend**
  - `npm run lint`, `npm run typecheck`, and Jest/Playwright tests enforce correctness.
  - Git hooks via `lint-staged` run ESLint/Prettier on staged TypeScript files.

- **Frontend**
  - TypeScript strict mode and Vite ensure type safety and fast builds.
  - Vitest + Testing Library cover components and hooks.
  - `lint-staged` formats `frontend/src` with Prettier on commit.

