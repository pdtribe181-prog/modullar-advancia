# Advancia PayLedger

> Healthcare payment and compliance management platform

[![Backend](https://img.shields.io/badge/Backend-Live-brightgreen)](https://modullar-advancia.onrender.com)
[![Frontend](https://img.shields.io/badge/Frontend-Live-brightgreen)](https://app.advancia.us)
[![Tests](https://img.shields.io/badge/Tests-131%20Passing-brightgreen)]()

## Live URLs

| Service | URL | Status |
|---------|-----|--------|
| **App** | https://app.advancia.us | ✅ Live |
| **API** | https://modullar-advancia.onrender.com | ✅ Live |
| **API Docs** | https://modullar-advancia.onrender.com/docs | ✅ Live |
| **Landing** | https://advancia.us | ✅ Live |

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe (card payments)
- **Frontend**: React + Vite + TypeScript
- **Hosting**: Render (API) + Vercel (Frontend)
- **Monitoring**: Sentry
- **Email**: Resend
- **SMS**: Twilio

## Quick Start

```bash
# Clone and install
git clone https://github.com/pdtribe181-prog/modullar-advancia.git
cd modullar-advancia
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start backend
npm run dev           # API at http://localhost:3000

# Start frontend (new terminal)
cd frontend
npm install
npm run dev           # App at http://localhost:5173
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

## Project Structure

```
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
# Backend (Render auto-deploys from main branch)
git push origin main

# Frontend
cd frontend && vercel --prod
```

## Security Features

- JWT authentication with Supabase Auth
- Row-Level Security (RLS) on all tables
- Rate limiting per endpoint category
- Helmet security headers
- CORS whitelist
- MFA support (TOTP)

## Rate Limits

| Category | Limit |
|----------|-------|
| API | 100 req/15min |
| Auth | 10 req/15min |
| Payments | 10 req/min |
| Sensitive | 20 req/hour |
| Webhooks | 100 req/min |

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add feature'`
4. Push: `git push origin feature/my-feature`
5. Open Pull Request

## License

MIT
