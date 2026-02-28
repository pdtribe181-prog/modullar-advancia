# Troubleshooting Guide — Advancia PayLedger

> Last updated: auto-generated

## Quick Diagnostic Commands

```bash
# Application health
curl -s http://localhost:3000/health | jq .

# Application metrics
curl -s http://localhost:3000/metrics

# PM2 process status
pm2 status

# Recent logs (last 100 lines)
pm2 logs healthcare-api --lines 100

# System resources
htop
df -h
free -m
```

---

## 1. Application Won't Start

### Symptom: PM2 shows "errored" or rapid restarts

**Check logs:**

```bash
pm2 logs healthcare-api --err --lines 50
```

**Common causes:**

| Error Message                   | Cause                          | Fix                                                 |
| ------------------------------- | ------------------------------ | --------------------------------------------------- |
| `Missing required env`          | Missing environment variable   | Check `.env` — compare with `.env.example`          |
| `EADDRINUSE :3000`              | Port already in use            | `pm2 kill && pm2 start ecosystem.config.cjs`        |
| `Cannot find module`            | Build artifacts missing        | `npm run build`                                     |
| `SyntaxError: Unexpected token` | Bad build / wrong Node version | `node -v` (must be ≥ 22), `npm ci && npm run build` |
| `ECONNREFUSED` on startup       | Supabase/Redis unreachable     | Check network, Supabase status page                 |

**Nuclear restart:**

```bash
pm2 kill
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

## 2. Database Connection Issues

### Symptom: `/health` returns `"database": "disconnected"`

**Verify Supabase status:**

- Check https://status.supabase.com
- Check project dashboard: https://app.supabase.com/project/pikguczsvikzragmrojz

**Verify connection string:**

```bash
# Test from VPS
curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

**Connection pool exhaustion:**

```sql
-- Check active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Kill idle connections (if needed)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '10 minutes';
```

**Fix: Restart to reset connection pool:**

```bash
pm2 reload ecosystem.config.cjs
```

## 3. Payment Processing Failures

### Symptom: Payments stuck in "pending" or returning errors

**Check Stripe Dashboard:**

1. https://dashboard.stripe.com/events — look for failed events
2. https://dashboard.stripe.com/webhooks — check delivery status

**Check webhook delivery:**

```bash
# Check if webhook endpoint is reachable
curl -X POST http://localhost:3000/api/v1/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should return 400 (bad signature) NOT 404
```

**Common payment errors:**

| Stripe Error                            | Meaning                  | Action                                           |
| --------------------------------------- | ------------------------ | ------------------------------------------------ |
| `card_declined`                         | Customer's card declined | Ask customer to use different card               |
| `expired_card`                          | Card has expired         | Ask customer to update card                      |
| `insufficient_funds`                    | Not enough balance       | Ask customer to fund card                        |
| `authentication_required`               | 3D Secure needed         | Ensure frontend handles `requires_action` status |
| `webhook_signature_verification_failed` | Webhook secret mismatch  | Update `STRIPE_WEBHOOK_SECRET` in `.env`         |

**Re-process stuck payment:**

```bash
# Trigger manual webhook for a specific event
stripe events resend evt_xxxx
```

## 4. Authentication Issues

### Symptom: Users can't log in or tokens expire immediately

**Check Supabase Auth settings:**

- Dashboard → Authentication → Settings
- Verify JWT expiry (default: 3600s)
- Verify site URL and redirect URLs

**Common auth errors:**

| Error                       | Cause                    | Fix                                                      |
| --------------------------- | ------------------------ | -------------------------------------------------------- |
| `Invalid login credentials` | Wrong email/password     | Reset password                                           |
| `Email not confirmed`       | User didn't verify email | Resend verification or disable email confirmation        |
| `Token expired`             | JWT expired              | Check `JWT_EXPIRY` env, ensure frontend refreshes tokens |
| `Invalid refresh token`     | Token revoked or reused  | User must re-authenticate                                |

**Debug token:**

```bash
# Decode JWT (without verifying)
echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

## 5. Rate Limiting Issues

### Symptom: Legitimate users getting 429 Too Many Requests

**Check current limits:**

- General API: 100 req/15 min per IP (configurable)
- Payment endpoints: 20 req/15 min per IP
- Auth endpoints: 5 req/15 min per IP

**Verify Redis is working:**

```bash
curl -s http://localhost:3000/health | jq .redis
# Should show: { "status": "connected", "kind": "upstash" }
```

**Temporarily increase limits:**
Edit `src/middleware/rateLimit.middleware.ts` and redeploy.

**Clear rate limit for specific IP (Redis CLI):**

```bash
# Via Upstash REST API
curl "$UPSTASH_REDIS_REST_URL/del/rate-limit:<IP>" -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

## 6. Email/SMS Delivery Issues

### Symptom: Users not receiving emails or SMS

**Email (Resend):**

1. Check Resend dashboard: https://resend.com/emails
2. Verify `RESEND_API_KEY` is valid
3. Check DMARC/SPF/DKIM records:

```bash
dig TXT advanciapayledger.com +short
dig TXT _dmarc.advanciapayledger.com +short
```

**SMS (Twilio):**

1. Check Twilio console: https://console.twilio.com/
2. Verify account balance
3. Verify phone number is active
4. Check geographic permissions

**Circuit breaker tripped:**

```bash
curl -s http://localhost:3000/health | jq .circuitBreakers
# If state is "OPEN", the service had too many failures
# Wait for recovery window (30-60 seconds) or restart
```

## 7. High Memory Usage

### Symptom: PM2 shows high memory, frequent restarts

**Check per-process memory:**

```bash
pm2 monit
# or
pm2 describe healthcare-api | grep memory
```

**Identify memory leaks:**

```bash
# Take a heap snapshot
node --inspect=0.0.0.0:9229 dist/server.js
# Connect Chrome DevTools: chrome://inspect
```

**Quick fixes:**

- Reduce PM2 `max_memory_restart` to force earlier recycling
- Increase VPS memory
- Check for event listener leaks (common in Express)

## 8. Slow API Responses

### Symptom: p95 response time > 500ms

**Identify slow endpoints:**

```bash
curl -s http://localhost:3000/metrics/json | jq '.endpoints | sort_by(-.latency.p95) | .[0:5]'
```

**Database query analysis:**

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Check cache hit rate:**

```bash
# If Redis is down, all requests hit the database
curl -s http://localhost:3000/health | jq .redis
```

**Immediate fixes:**

1. Enable/extend cache TTL for slow endpoints
2. Add missing database indexes
3. Scale PM2 instances: `pm2 scale healthcare-api +2`

## 9. CORS Errors

### Symptom: Frontend shows "Access to fetch has been blocked by CORS policy"

**Check CORS config:**

```bash
# Verify allowed origins
grep -r "CORS\|cors\|FRONTEND_URL" .env
```

**Fix:** Update `FRONTEND_URL` and `CORS_ORIGINS` in `.env`:

```
FRONTEND_URL=https://advanciapayledger.com
CORS_ORIGINS=https://advanciapayledger.com,https://www.advanciapayledger.com
```

Then restart: `pm2 reload ecosystem.config.cjs`

## 10. SSL/TLS Certificate Issues

### Symptom: Browser shows "Not Secure" or certificate errors

**Check certificate expiry:**

```bash
echo | openssl s_client -servername advanciapayledger.com -connect advanciapayledger.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Renew Certbot certificate:**

```bash
sudo certbot renew --dry-run  # Test first
sudo certbot renew            # Actually renew
sudo nginx -s reload          # Reload Nginx
```

**Cloudflare SSL mode:**

- Must be set to **Full (Strict)** if origin has valid cert
- Set to **Full** if using self-signed origin cert

## 11. Common Error Codes Reference

| HTTP Code | Meaning               | Common Cause                               |
| --------- | --------------------- | ------------------------------------------ |
| 400       | Bad Request           | Invalid request body/params                |
| 401       | Unauthorized          | Missing or expired token                   |
| 403       | Forbidden             | Valid token but insufficient role          |
| 404       | Not Found             | Wrong URL or resource deleted              |
| 409       | Conflict              | Duplicate key (e.g., email already exists) |
| 422       | Unprocessable         | Validation failed (Zod schema)             |
| 429       | Too Many Requests     | Rate limit exceeded                        |
| 500       | Internal Server Error | Bug — check Sentry                         |
| 502       | Bad Gateway           | PM2 crashed, Nginx can't reach backend     |
| 503       | Service Unavailable   | Health check failing                       |

## 12. Escalation Path

| Level            | Contact                           | Response Time |
| ---------------- | --------------------------------- | ------------- |
| L1: Self-service | This guide + logs + metrics       | Immediate     |
| L2: Team         | On-call engineer                  | < 30 min      |
| L3: External     | Supabase Support / Stripe Support | < 4 hours     |
| Emergency        | All hands + vendor support        | < 15 min      |
