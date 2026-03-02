# Admin management, console usage & end-to-end testing

---

## 1. Admin management (backend & frontend)

### Backend

- **Routes:** `src/routes/admin.routes.ts` — mounted at **`/api/v1/admin`**.
- **Auth:** Every admin route uses **`requireAdmin`** = `[authenticate, requireRole('admin')]` (see `src/middleware/auth.middleware.ts`).
  - **401** — Missing or invalid `Authorization: Bearer <token>`.
  - **403** — Valid token but user role ≠ `admin`.
- **Endpoints (examples):**  
  `GET /admin/dashboard`, `GET /admin/users`, `GET /admin/transactions`, `GET /admin/disputes`, `GET /admin/providers`, `GET /admin/webhooks`, `GET /admin/audit-log`, `GET /admin/analytics/revenue`, `GET /admin/system/health`, `PUT /admin/users/:id/status`, `PATCH /admin/disputes/:id`, etc.
- **Unit tests:** `src/__tests__/admin.routes.test.ts` — mocks Supabase and auth; covers dashboard, users, transactions, disputes, providers, webhooks, audit-log, system health.

### Frontend

- **Route:** `/admin` and `/admin/audit-log` in `App.tsx`, wrapped in **`RoleGuard`** with `allowedRoles={['admin']}`.
  - Not logged in → redirect to **/login**.
  - Logged in but role ≠ admin → redirect to **/dashboard**.
- **Pages:** `AdminConsole.tsx` (tabs: Overview, Users, Transactions, Webhooks, Audit log), `AuditLog.tsx`.
- **Nav:** “⚙️ Admin” link in header/footer only when `user.role === 'admin'` (Layout.tsx).

### Parallel / concurrency

- Admin API handlers use **async/await** and **Promise.all** where appropriate (e.g. dashboard fetches multiple counts in parallel). No special “parallel” mode; normal request handling.

---

## 2. Console usage (frontend)

- **Production:** Avoid logging sensitive data. Most `console.error` / `console.warn` in the app are guarded with **`import.meta.env.DEV`** so they only run in development.
- **Examples:**
  - `api.ts`: `console.warn('[API] VITE_API_URL not set...')` — dev/build time.
  - `AdminConsole.tsx`, `SecuritySettings.tsx`, `ProviderDashboard.tsx`, `Appointments.tsx`: `if (import.meta.env.DEV) console.error(...)`.
  - `ErrorBoundary.tsx`: `if (import.meta.env.DEV) console.error(...)`.
- **Unconditional:** A few places (e.g. `Invoices.tsx`, `Disputes.tsx`, `KYCVerification.tsx`, `EmailVerification.tsx`) use `console.error` without a DEV check. For production you can replace with Sentry or remove; they do not log secrets.
- **Tests:** Some unit tests suppress `console.error` to avoid noise (e.g. `Toast.test.tsx`, `AuthProvider.test.tsx`).

---

## 3. End-to-end testing (Playwright)

### Layout

- **Location:** `e2e/*.spec.ts`.
- **Config:** `config/playwright.config.ts` (full UI + API against frontend + backend); `config/playwright.api.config.ts` runs only `api.spec.ts` (API-only, single backend).
- **CI:** Playwright can start backend and frontend via `webServer`; locally you run `npm run dev` and `cd frontend && npm run dev` yourself.

### Specs and coverage

| Spec | What it covers |
|------|----------------|
| **api.spec.ts** | Health, docs, CORS, security headers, optional auth/profile. |
| **auth.spec.ts** | Login form, validation, invalid credentials, signup link, protected routes redirect to login, navigation to login. |
| **payments.spec.ts** | Payment flow (if Stripe env present). |
| **appointments.spec.ts** | Appointments flow. |
| **admin.spec.ts** | Admin API (401 without auth, 401 invalid token, 403 non-admin when `E2E_USER_TOKEN` set, 200 + data when `E2E_ADMIN_TOKEN` set). Admin UI: /admin and /admin/audit-log redirect to login when not logged in; non-admin redirects to dashboard; admin console loads when `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` set. |

### Running E2E

```bash
# Full E2E (start API + frontend yourself, or rely on CI)
npx playwright test

# API-only (backend must be running)
npx playwright test --config=config/playwright.api.config.ts

# Admin E2E (optional env for full coverage)
E2E_ADMIN_TOKEN=<jwt> E2E_USER_TOKEN=<jwt> npx playwright test e2e/admin.spec.ts
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=... npx playwright test e2e/admin.spec.ts
```

### Optional env for admin E2E

| Variable | Purpose |
|----------|--------|
| `E2E_ADMIN_TOKEN` | JWT for admin user; used in API tests for GET /admin/dashboard (200). |
| `E2E_USER_TOKEN` | JWT for non-admin user; used for 403 test. |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Login as admin in UI; used for “admin console loads” test. |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | Login as non-admin; used for “/admin redirects to dashboard” test. |

If these are not set, the corresponding admin tests are **skipped** (no failure).

---

## 4. Checklist

- [x] Admin routes protected by `requireAdmin` (authenticate + role admin).
- [x] Frontend /admin and /admin/audit-log guarded by RoleGuard (admin only).
- [x] Unit tests for admin routes (admin.routes.test.ts).
- [x] E2E: admin API 401/403 and 200 (with token); admin UI redirects and console load (with creds).
- [x] Console: DEV-guarded where appropriate; optional cleanup for unconditional console.error in a few pages.
