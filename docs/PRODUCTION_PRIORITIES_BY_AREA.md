# Production Priorities By Area

Use this as the short, execution-focused guide for what to work on next.

## Actual stack to keep

- Frontend: React + Vite
- Styling: custom CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL on Supabase
- Auth: Supabase Auth
- Payments: Stripe
- Hosting: Vercel frontend + VPS/Render backend + Supabase
- Monitoring: Sentry

Do not treat this repo as a Next.js, Fastify, or Prisma project unless you explicitly decide to do a costly migration. That is not the recommended path for current production work.

## Priority order

1. Frontend reliability and auth UX
2. Backend security and API correctness
3. Database migration discipline and RLS validation
4. Payment and billing correctness
5. Infrastructure and observability hardening
6. AI integration after core flows are stable

## Frontend

Focus on user-critical screens and role-aware navigation first.

- Harden auth state, token expiry handling, and logout behavior in `frontend/src/providers/AuthProvider.tsx`.
- Verify protected routes and role gating in `frontend/src/App.tsx`.
- Improve dashboard and admin-console loading/error states before design rewrites.
- Validate payment flows, redirects, and Stripe publishable-key configuration.
- Defer Tailwind or Next.js migration work; it adds risk without improving launch readiness.

## Backend

Keep Express and harden the current API surface.

- Prioritize auth, admin, billing, webhook, and metrics routes.
- Keep fixing security findings, rate limiting gaps, and validation coverage.
- Expand targeted tests around routes that touch payments, admin actions, or sensitive data.
- Preserve the current middleware pipeline in `src/server.ts`; do not replace it with Fastify during launch work.

## Database

Supabase PostgreSQL is already the database system of record.

- Treat SQL migrations under `migrations/` and `migrations-ready/` as the source of truth.
- Verify RLS policies for admin, provider, and patient data paths.
- Check backup, restore, and staging migration repeatability.
- Do not introduce Prisma unless you plan a full access-layer refactor.

## Authentication

Supabase Auth is the correct current auth layer.

- Validate login, signup, forgot-password, token refresh, logout, and role hydration end to end.
- Ensure backend role checks remain enforced even when frontend guards exist.
- Recheck redirect URLs, OAuth config, and domain-specific auth callbacks.

## Payments and billing

Stripe is already the payments backbone.

- Verify live key separation between staging and production.
- Validate webhook signature handling and replay safety.
- Reconcile payment intents, invoices, disputes, refunds, and Connect onboarding.
- Make billing correctness higher priority than UI polish.

## Infrastructure

Current hosting direction is valid.

- Keep Vercel for frontend, Supabase for database/auth/storage, and current backend deployment path.
- Complete Cloudflare, DNS, SSL, WAF, secret rotation, and alerting tasks from production docs.
- Add structured log shipping only if needed; Sentry is already the primary error-monitoring system.
- Logtail is optional and not currently a required dependency for go-live.

## AI integration

AI is not the launch-critical workstream.

- Keep existing AI-related schema and internal tooling stable.
- Do not wire external LLM features into sensitive payment or auth paths until audit logging, permissions, and cost controls are defined.
- Treat AI as a post-stabilization phase after auth, payments, and admin flows are solid.

## Recommended next sprint

1. Frontend: auth/session edge cases, payment screens, admin console error handling.
2. Backend: auth, metrics, admin, Stripe, and webhook hardening.
3. Database: migration audit, RLS verification, backup/restore proof.
4. Infrastructure: finish production checklist items that still require manual external setup.

## Reference docs

- `docs/PROJECT_COMPLETION_STATUS.md`
- `docs/PRODUCTION_CHECKLIST.md`
- `docs/PRODUCTION_STATUS.md`
- `docs/DEPLOYMENT_READINESS.md`
- `docs/PAYMENTS_CONFIG_AND_FIXES.md`
- `docs/INFRASTRUCTURE_AND_DOMAINS.md`