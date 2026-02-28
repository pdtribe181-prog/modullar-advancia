# Advancia PayLedger

> Healthcare payment and compliance management platform

[![CI Pipeline](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/ci.yml/badge.svg)](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/ci.yml)
[![Automated Testing (Extended)](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/automated-testing.yml/badge.svg)](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/automated-testing.yml)
[![Playwright Nightly](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/playwright-nightly.yml/badge.svg)](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/playwright-nightly.yml)
[![Security Scan](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/security-scan.yml/badge.svg)](https://github.com/pdtribe181-prog/modullar-advancia/actions/workflows/security-scan.yml)

## Live URLs

| Service   | URL                                        | Status  |
| --------- | ------------------------------------------ | ------- |
| **App**   | <https://advanciapayledger.com>            | ✅ Live |
| **API**   | <https://api.advanciapayledger.com/api/v1> | ✅ Live |
| **Brand** | <https://advanciapayledger.com>            | ✅ Live |

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe (card payments)
- **Frontend**: React + Vite + TypeScript
- **Hosting**: Hostinger VPS (Frontend + API) with Cloudflare proxy/CDN
- **Monitoring**: Sentry
- **Email**: Resend
- **SMS**: Twilio

## Quick Start

More detailed setup (including WSL2): see [DEV_SETUP.md](./DEV_SETUP.md).

```bash
# Clone and install
git clone https://github.com/pdtribe181-prog/modullar-advancia.git
cd modullar-advancia
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start backend
npm run dev           # API at http://127.0.0.1:3000

# Start frontend (new terminal)
cd frontend
npm install
npm run dev           # App at http://127.0.0.1:5173
```

## Environment Variables

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173

# Optional
RESEND_API_KEY=re_...           # Email notifications
TWILIO_ACCOUNT_SID=AC...        # SMS notifications
SENTRY_DSN=https://...          # Error monitoring
```

### Staging (Render + Supabase)

This project supports a staging API on Render and should use a dedicated Supabase staging project.

- Staging API hostname: `api-staging.advanciapayledger.com`
- Render origin: `modullar-advancia.onrender.com`
- Keep staging and production Supabase projects fully separate.

Use [.env.staging.example](.env.staging.example) as the source of truth for staging variables.

Minimum required staging variables in Render:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (test key)
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `SENTRY_DSN` and `SENTRY_ENVIRONMENT=staging`

#### Render ↔ Supabase (Staging) Env Mapping

| Render Environment Variable       | Staging Value Source               | Notes                                   |
| --------------------------------- | ---------------------------------- | --------------------------------------- |
| `SUPABASE_URL`                    | Supabase staging project URL       | Must not point to production            |
| `SUPABASE_ANON_KEY`               | Supabase staging API keys          | Safe for client-facing use              |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase staging API keys          | Server only, never expose in frontend   |
| `SUPABASE_WEBHOOK_SECRET`         | Staging secret value               | Must match sender integration           |
| `DATABASE_URL` (if used)          | Supabase staging connection string | Keep separate from prod DB              |
| `SUPABASE_ACCESS_TOKEN` (if used) | Supabase personal token            | Use least privilege token               |
| `SENTRY_ENVIRONMENT`              | `staging`                          | Keeps events separated from prod        |
| `STRIPE_SECRET_KEY`               | Stripe test key (`sk_test_...`)    | Never use live key in staging           |
| `STRIPE_WEBHOOK_SECRET`           | Staging webhook endpoint secret    | Separate from production webhook secret |

## Project Structure

```text
modullar-advancia/
├── src/
│   ├── server.ts              # Express entry point
│   ├── config/                # Environment config
│   ├── lib/                   # Supabase client
│   ├── middleware/            # Auth, rate limiting, security
│   ├── routes/                # API endpoints
│   │   ├── auth.routes.ts     # Login, register, MFA
│   │   ├── stripe.routes.ts   # Payments, subscriptions
│   │   ├── connect.routes.ts  # Provider onboarding
│   │   ├── admin.routes.ts    # Admin dashboard
│   │   ├── appointments.routes.ts
│   │   ├── provider.routes.ts
│   │   └── wallet.routes.ts   # Crypto wallet linking
│   ├── services/              # Business logic
│   └── __tests__/             # Jest unit tests
├── frontend/
│   ├── src/
│   │   ├── pages/             # React pages
│   │   ├── components/        # UI components
│   │   └── providers/         # Auth, Stripe context
│   └── package.json
├── migrations/                # SQL migrations (001-019)
├── e2e/                       # Playwright E2E tests
├── render.yaml                # Render deployment config
└── openapi.yaml               # API documentation
```

## API Endpoints

### Health & Docs

- `GET /health` - Health check with DB status
- `GET /docs` - Swagger API documentation

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (returns JWT)
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token
- `POST /auth/forgot-password` - Password reset email
- `POST /auth/reset-password` - Reset password
- `POST /auth/mfa/enroll` - Enable MFA
- `POST /auth/mfa/verify` - Verify MFA code

### Payments (requires auth)

- `POST /stripe/payment-intents` - Create payment
- `GET /stripe/payment-intents/:id` - Get payment status
- `POST /stripe/customers` - Create customer
- `POST /stripe/refunds` - Issue refund
- `POST /stripe/subscriptions` - Create subscription

### Provider Connect (providers only)

- `POST /connect/onboard` - Start Stripe onboarding
- `GET /connect/status` - Onboarding status
- `GET /connect/balance` - Provider balance
- `GET /connect/dashboard` - Stripe dashboard link

### Admin (admin role only)

- `GET /admin/dashboard` - Overview stats
- `GET /admin/transactions` - Transaction list
- `GET /admin/disputes` - Dispute management
- `GET /admin/analytics/revenue` - Revenue reports

### Webhooks

- `POST /stripe/webhook` - Stripe events
- `POST /webhooks/supabase` - Database triggers

## Database

97+ tables including:

- `user_profiles`, `patients`, `providers`
- `appointments`, `transactions`, `invoices`
- `disputes`, `notifications`, `audit_events`
- `stripe_customers`, `stripe_webhook_events`
- `recurring_billing`, `payment_schedules`

## Testing

```bash
npm test              # 131 Jest unit tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright E2E tests
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

### Quick Deploy

```bash
# Full stack on VPS (Nginx serves frontend, proxies API)
ssh advancia-vps 'cd /var/www/advancia && git pull && npm ci && npm run build && pm2 reload advancia-api'
```

### Staging API (Render)

- Render blueprint file: [render.yaml](render.yaml)
- Service target: `modullar-advancia.onrender.com`
- Recommended DNS: `api-staging.advanciapayledger.com` CNAME to Render target (proxied via Cloudflare)
- Operational guide: [STAGING_RUNBOOK.md](STAGING_RUNBOOK.md)

## DNS Configuration (Cloudflare)

Current production DNS is managed in Cloudflare with Hostinger VPS as origin.

| Type  | Name                          | Target / Value                             | Proxy    |
| ----- | ----------------------------- | ------------------------------------------ | -------- |
| A     | `advanciapayledger.com`       | `76.13.77.8`                               | Proxied  |
| A     | `api`                         | `76.13.77.8`                               | Proxied  |
| CNAME | `api-staging`                 | `modullar-advancia.onrender.com`           | Proxied  |
| MX    | `advanciapayledger.com`       | `route1/2/3.mx.cloudflare.net`             | DNS only |
| MX    | `send`                        | `feedback-smtp.eu-west-1.amazonses.com`    | DNS only |
| TXT   | `advanciapayledger.com`       | SPF configured (`_spf.mx.cloudflare.net`)  | DNS only |
| TXT   | `_dmarc`                      | DMARC configured (reporting enabled)       | DNS only |
| TXT   | `resend._domainkey`           | DKIM configured (Resend)                   | DNS only |
| TXT   | `cf2024-1._domainkey`         | DKIM configured (Cloudflare Email Routing) | DNS only |
| TXT   | `20251219192150pm._domainkey` | DKIM configured                            | DNS only |

Notes:

- API and apex are proxied through Cloudflare (orange cloud).
- Origin server for both frontend and API is Hostinger VPS (`76.13.77.8`).
- Email deliverability/authentication records (SPF/DKIM/DMARC) are configured in DNS.

## Security Features

- JWT authentication with Supabase Auth
- Row-Level Security (RLS) on all tables
- Rate limiting per endpoint category
- Helmet security headers
- CORS whitelist
- MFA support (TOTP)

## Rate Limits

| Category  | Limit         |
| --------- | ------------- |
| API       | 100 req/15min |
| Auth      | 10 req/15min  |
| Payments  | 10 req/min    |
| Sensitive | 20 req/hour   |
| Webhooks  | 100 req/min   |

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add feature'`
4. Push: `git push origin feature/my-feature`
5. Open Pull Request

## License

MIT
