# Sentry Alert Configuration Guide

Configure these alert rules in the [Sentry Dashboard](https://sentry.io/) → **Alerts → Create Alert**.

---

## 1. High Error Rate

| Setting | Value |
|---------|-------|
| **Type** | Issue Alert |
| **When** | Number of events in 1 hour exceeds 50 |
| **Filter** | `level:error OR level:fatal` |
| **Action** | Email team + Slack (if configured) |
| **Priority** | High |

## 2. Payment Failures

| Setting | Value |
|---------|-------|
| **Type** | Issue Alert |
| **When** | A new issue is created |
| **Filter** | `tags[transaction]:*stripe*` OR `message:*payment*failed*` |
| **Action** | Email team immediately |
| **Priority** | Critical |

## 3. Database Connection Errors

| Setting | Value |
|---------|-------|
| **Type** | Issue Alert |
| **When** | A new issue is created |
| **Filter** | `message:*database*error*` OR `message:*supabase*` OR tags include `database:error` |
| **Action** | Email + SMS (if Twilio configured) |
| **Priority** | Critical |

## 4. Slow Transactions (P95 > 2s)

| Setting | Value |
|---------|-------|
| **Type** | Metric Alert |
| **Metric** | `transaction.duration` P95 |
| **When** | P95 > 2000ms for 5 minutes |
| **Filter** | `transaction.op:http.server` |
| **Action** | Email team |
| **Priority** | Medium |

## 5. Unhandled Exceptions

| Setting | Value |
|---------|-------|
| **Type** | Issue Alert |
| **When** | A new issue is created |
| **Filter** | `error.unhandled:true` |
| **Action** | Email team |
| **Priority** | High |

---

## Alert Routing

| Priority | Channel | Response SLA |
|----------|---------|-------------|
| Critical | Email + SMS | 15 min |
| High | Email | 1 hour |
| Medium | Email digest | 4 hours |
| Low | Dashboard only | Next business day |

## Team Notification Settings

Go to **Settings → Notifications → Alerts** and configure:

1. **Delivery method**: Email (required), Slack (recommended)
2. **Frequency**: Real-time for Critical/High, Digest for Medium/Low
3. **Quiet hours**: Optional — disable non-critical alerts 10pm–7am

## Environment Configuration

Ensure `SENTRY_ENVIRONMENT` is set correctly per deployment:

```bash
# Production
SENTRY_ENVIRONMENT=production

# Staging
SENTRY_ENVIRONMENT=staging
```

This allows filtering alerts by environment to avoid staging noise in production channels.
