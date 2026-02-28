# Admin Manual — Advancia PayLedger

> Healthcare Payment Platform — Administrator Guide

---

## Access

Only users with the `admin` role can access the Admin Console.

- **URL**: https://advanciapayledger.com/admin
- **API prefix**: `/api/v1/admin/*`
- **Assign admin role**: Update `user_profiles.role` to `'admin'` in Supabase Dashboard or via SQL

---

## 1. Admin Console Overview

### Dashboard Panels

| Panel                 | Shows                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **System Health**     | API status, database status, Redis status, circuit breaker states |
| **User Stats**        | Total users, new registrations (7d), active users (24h)           |
| **Financial Summary** | Total revenue (MTD), transaction count, average payment size      |
| **Active Disputes**   | Open disputes requiring attention                                 |
| **Error Rate**        | Current 5xx error rate from `/metrics`                            |

---

## 2. User Management

### View Users

- **Admin Console** → **Users**
- Search by name, email, or role
- Filter: Active, Inactive, Suspended, All
- Sort by registration date, last login, or name

### User Actions

| Action             | Description                          | How                                      |
| ------------------ | ------------------------------------ | ---------------------------------------- |
| **View Profile**   | See full user details + activity log | Click user row                           |
| **Change Role**    | Promote/demote user                  | User detail → Edit → Role dropdown       |
| **Suspend**        | Temporarily disable account          | User detail → Actions → Suspend          |
| **Delete**         | Permanently remove (GDPR erasure)    | User detail → Actions → Delete → Confirm |
| **Reset Password** | Send password reset email            | User detail → Actions → Reset Password   |

### Role Definitions

| Role       | Permissions                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| `patient`  | View own data, make payments, book appointments                                  |
| `provider` | All patient permissions + manage appointments, view own patients, issue invoices |
| `staff`    | View reports, manage appointments, limited admin                                 |
| `admin`    | Full access to all features + admin console                                      |

---

## 3. Financial Operations

### Transaction Monitoring

- **Admin Console** → **Transactions**
- Real-time transaction feed with status indicators
- Filters: Status (succeeded, failed, pending, refunded), date range, amount range, provider, patient

### Issue Refunds

1. Find the transaction in the transaction list
2. Click → **Refund**
3. Enter full or partial amount
4. Add admin notes (required)
5. Confirm — refund processes through Stripe

### Review Disputes

1. **Admin Console** → **Disputes**
2. Review dispute details and evidence
3. Add admin notes
4. Submit response to Stripe or resolve directly
5. Track resolution status

### Payout Management

- View all pending and completed payouts to providers
- Pause payouts for specific providers (if under investigation)
- Resume payouts after resolution

---

## 4. Provider Management

### Approve Providers

New provider registrations require verification:

1. **Admin Console** → **Providers** → **Pending**
2. Review submitted credentials:
   - Medical license validity
   - NPI verification
   - Stripe Connect onboarding status
3. **Approve** or **Reject** with notes

### Monitor Provider Activity

- View revenue per provider
- Track patient satisfaction ratings
- Review dispute rates
- Identify inactive providers

---

## 5. Analytics & Reporting

### Available Admin Reports

| Report             | API Endpoint                     | Description                   |
| ------------------ | -------------------------------- | ----------------------------- |
| Dashboard Stats    | `GET /api/v1/admin/stats`        | Overview metrics              |
| Transaction Report | `GET /api/v1/admin/transactions` | All transactions with filters |
| User Growth        | `GET /api/v1/admin/users/growth` | Registration trends           |
| Revenue Report     | `GET /api/v1/admin/revenue`      | Revenue breakdown by period   |
| Dispute Report     | `GET /api/v1/admin/disputes`     | Dispute rate and outcomes     |

### Custom Metrics Dashboard

Access application metrics:

- **Prometheus format**: `GET /metrics` (for automated scrapers)
- **JSON format**: `GET /metrics/json` (admin authenticated)
- **Persist snapshot**: `POST /metrics/persist` (writes to DB for historical tracking)

Key metrics tracked:

- Transaction volume and success rate
- API response times (p50/p95/p99 per endpoint)
- Active users (5-minute and 1-hour windows)
- Error rate

---

## 6. System Administration

### Health Monitoring

```bash
# API health check
curl https://api.advanciapayledger.com/health

# Prometheus metrics
curl https://api.advanciapayledger.com/metrics
```

### Data Retention

- **View policies**: `GET /api/v1/retention/policies`
- **Manual enforcement**: `POST /api/v1/retention/enforce` (admin only)
- **Enforcement history**: `GET /api/v1/retention/history`

18 policies covering HIPAA (7-year), PCI-DSS (1-year), and GDPR requirements.

### GDPR Administration

Process data subject requests:

| Request Type  | Endpoint                                | SLA       |
| ------------- | --------------------------------------- | --------- |
| Data Export   | `GET /api/v1/gdpr/export?userId={id}`   | 30 days   |
| Data Erasure  | `POST /api/v1/gdpr/erasure`             | 30 days   |
| Consent Check | `GET /api/v1/gdpr/consents?userId={id}` | Immediate |

### Audit Logs

All API operations are logged automatically:

- Access audit logs (who accessed what, when)
- Compliance logs (GDPR actions, financial operations)
- Security events (failed logins, role changes, suspicious activity)

View in **Supabase Dashboard** → Tables:

- `access_audit_logs`
- `compliance_logs`
- `security_events`

Or via the admin audit log page: https://advanciapayledger.com/admin/audit-log

---

## 7. Security Administration

### Rate Limiting

Current limits (configurable in `src/middleware/rateLimit.middleware.ts`):

| Tier              | Limit        | Window     |
| ----------------- | ------------ | ---------- |
| General API       | 100 requests | 15 minutes |
| Payment endpoints | 20 requests  | 15 minutes |
| Auth endpoints    | 5 requests   | 15 minutes |

### Circuit Breakers

Monitor external service health:

| Service        | Failure Threshold | Recovery Time |
| -------------- | ----------------- | ------------- |
| Stripe         | 5 failures        | 30 seconds    |
| Resend (email) | 3 failures        | 60 seconds    |
| Twilio (SMS)   | 3 failures        | 60 seconds    |

Status visible at `GET /health` → `circuitBreakers` field.

### Webhook Security

- Stripe webhooks validated via HMAC signature
- Idempotency guard prevents duplicate processing (24h TTL in Redis)
- Database webhooks authenticated via shared secret

---

## 8. Deployment & Maintenance

### Deploy New Version

```bash
ssh root@76.13.77.8
cd /root/modullar-advancia
git pull origin main
npm ci
npm run build
pm2 reload ecosystem.config.cjs
```

### Run Migrations

```bash
npx tsx scripts/run-migration-rest.ts migrations/<filename>.sql
```

### Emergency Procedures

- **Rollback**: See [docs/ROLLBACK_PROCEDURE.md](ROLLBACK_PROCEDURE.md)
- **Backup Restore**: See [docs/BACKUP_RESTORATION.md](BACKUP_RESTORATION.md)
- **Troubleshooting**: See [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 9. Configuration Reference

### Environment Variables

| Variable                    | Description                     | Required |
| --------------------------- | ------------------------------- | -------- |
| `SUPABASE_URL`              | Supabase project URL            | Yes      |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key          | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key       | Yes      |
| `STRIPE_SECRET_KEY`         | Stripe API secret key           | Yes      |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signing secret   | Yes      |
| `RESEND_API_KEY`            | Resend email API key            | Yes      |
| `TWILIO_ACCOUNT_SID`        | Twilio account SID              | Yes      |
| `TWILIO_AUTH_TOKEN`         | Twilio auth token               | Yes      |
| `UPSTASH_REDIS_REST_URL`    | Redis REST URL                  | Yes      |
| `UPSTASH_REDIS_REST_TOKEN`  | Redis REST token                | Yes      |
| `SENTRY_DSN`                | Sentry error tracking DSN       | Yes      |
| `FRONTEND_URL`              | Frontend origin for CORS        | Yes      |
| `PORT`                      | API server port (default: 3000) | No       |

---

## Need Help?

- **Technical docs**: See `docs/` folder in the repository
- **API docs**: https://api.advanciapayledger.com/docs (Swagger UI)
- **Security issues**: security@advanciapayledger.com
