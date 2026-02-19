# Modullar Advancia

Healthcare payment and compliance management platform built with Supabase, Express, and Stripe.

## Quick Start

```bash
# Backend API
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Start API server at http://localhost:3000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev           # Start frontend at http://localhost:5173
```

## Environment Variables

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3001
PORT=3000
```

## Project Structure

```
modullar-advancia/
├── migrations/           # SQL migration files (001-018)
├── src/
│   ├── lib/supabase.ts         # Supabase client
│   ├── types/                  # TypeScript types
│   ├── config/                 # Production config
│   ├── middleware/             # Express middleware (auth, rate limiting)
│   ├── routes/                 # API routes
│   │   ├── stripe.routes.ts    # Stripe payment routes
│   │   ├── connect.routes.ts   # Provider onboarding
│   │   └── admin.routes.ts     # Admin dashboard API
│   ├── services/               # Business logic
│   │   ├── stripe.service.ts   # Stripe SDK wrapper
│   │   └── stripe-webhooks.service.ts
│   └── server.ts               # Express API server
├── src/__tests__/              # API & E2E tests
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # PaymentForm, Layout, etc
│   │   ├── pages/              # Home, Payment, Checkout, Dashboard
│   │   ├── providers/          # Auth, Stripe
│   │   └── services/           # API client
│   └── package.json
├── Dockerfile                  # Production container
├── docker-compose.yml          # Container orchestration
├── cloudbuild.yaml             # Google Cloud Build
└── package.json
```

## API Endpoints

### Public Routes
- `GET /health` - Health check
- `GET /providers` - List all providers
- `GET /providers/:id` - Get provider by ID
- `GET /stripe/products` - List products/services

### Authentication
- `POST /auth/signup` - Register user
- `POST /auth/signin` - Login (returns JWT)
- `POST /auth/signout` - Logout (requires auth)

### Protected Routes (requires `Authorization: Bearer <token>`)
- `GET /profile` - Get current user profile
- `PATCH /profile` - Update profile
- `GET /patients` - List patients
- `GET /appointments/patient/:id` - Patient appointments

### Stripe Payment Routes (Protected)
- `POST /stripe/customers` - Create Stripe customer
- `POST /stripe/payment-intents` - Create payment intent
- `GET /stripe/payment-intents/:id` - Get payment intent
- `POST /stripe/payment-intents/:id/confirm` - Confirm payment
- `POST /stripe/refunds` - Issue refund
- `POST /stripe/subscriptions` - Create subscription
- `POST /stripe/checkout/sessions` - Create checkout session
- `POST /stripe/invoices` - Create invoice

### Provider Connect Routes (Protected - Provider role)
- `POST /connect/onboard` - Start provider onboarding
- `GET /connect/status` - Check onboarding status
- `POST /connect/refresh` - Refresh onboarding link
- `GET /connect/dashboard` - Get Stripe dashboard link
- `GET /connect/balance` - Get provider balance
- `GET /connect/payouts` - Get payout history

### Admin Dashboard Routes (Protected - Admin role)
- `GET /admin/dashboard` - Overview stats
- `GET /admin/transactions` - List/filter transactions
- `GET /admin/transactions/:id` - Transaction details
- `GET /admin/disputes` - List disputes
- `PATCH /admin/disputes/:id` - Resolve dispute
- `GET /admin/providers` - Provider management
- `GET /admin/providers/:id/stripe` - Provider Stripe details
- `GET /admin/webhooks` - Webhook event log
- `GET /admin/audit-log` - Compliance audit log
- `GET /admin/analytics/revenue` - Revenue analytics
- `GET /admin/system/health` - System health check

### Stripe Webhook (No auth - uses Stripe signature)
- `POST /stripe/webhook` - Handle Stripe webhook events

## Local Development with Stripe

```bash
# Install Stripe CLI
winget install Stripe.StripeCLI  # Windows
brew install stripe/stripe-cli/stripe  # macOS

# Login to Stripe
stripe login

# Start webhook listener (get local webhook secret)
stripe listen --forward-to localhost:3000/stripe/webhook

# Update .env with CLI webhook secret for local dev
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Test webhook events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Database

97+ tables including: user_profiles, patients, providers, appointments, transactions, invoices, disputes, notifications, stripe_webhook_events, recurring_billing

## Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run production server
- `npm test` - Run API tests
- `npm run test:connection` - Test Supabase connection

## Deployment

### Docker
```bash
docker build -t healthcare-payment-api .
docker run -p 3000:3000 --env-file .env healthcare-payment-api
```

### Docker Compose
```bash
docker-compose up -d
```

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

### Google Cloud Run
```bash
gcloud run deploy healthcare-api --source .
```

## Rate Limiting

- API: 100 requests per 15 minutes
- Auth: 10 requests per 15 minutes
- Payments: 10 requests per minute
- Sensitive ops: 20 requests per hour
- Webhooks: 100 requests per minute

## License

MIT
