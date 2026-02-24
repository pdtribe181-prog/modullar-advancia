# Production Pre-Flight Checklist

**Date**: February 24, 2026  
**Project**: Modullar Advancia (Advancia PayLedger)  
**Version**: 1.0.0

---

## 📋 Executive Summary

This checklist ensures all systems are production-ready before go-live. Complete each section in order.

**Overall Status**: ⏳ In Progress

---

## 1. Environment Configuration

### Backend Environment Variables

- [x] `NODE_ENV=production`
- [x] `PORT=3000`
- [x] `SUPABASE_URL` - Set and validated
- [x] `SUPABASE_ANON_KEY` - Set and validated
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Set and validated
- [x] `STRIPE_SECRET_KEY` - Production key configured
- [x] `STRIPE_PUBLISHABLE_KEY` - Production key configured
- [x] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- [ ] `RESEND_API_KEY` - Production email API key
- [ ] `TWILIO_ACCOUNT_SID` - Production SMS credentials
- [ ] `TWILIO_AUTH_TOKEN` - Production SMS credentials
- [ ] `TWILIO_PHONE_NUMBER` - Production phone number
- [ ] `SENTRY_DSN` - Production Sentry DSN
- [ ] `UPSTASH_REDIS_REST_URL` - Production Redis URL
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Production Redis token
- [ ] `FRONTEND_URL=https://advanciapayledger.com`
- [ ] `CORS_ORIGINS` - Production domains configured

### Frontend Environment Variables

- [ ] `VITE_API_URL=https://api.advanciapayledger.com/api/v1`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Production key
- [ ] `VITE_SUPABASE_URL` - Production URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Production key
- [ ] `VITE_SENTRY_DSN` - Frontend Sentry DSN

### Security Verification

- [x] No `.env` files committed to repository
- [ ] All production secrets rotated from development
- [ ] Environment variables backed up securely
- [ ] API keys follow principle of least privilege

---

## 2. Database Setup

### Supabase Configuration

- [x] Database schema deployed (54 migrations)
- [x] Row Level Security (RLS) policies active on all tables
- [x] Database functions created
- [x] Triggers configured for audit logging
- [x] Storage buckets created
- [ ] Database backups configured (hourly)
- [ ] Point-in-time recovery enabled
- [ ] Connection pooling configured
- [ ] Performance indexes verified (migration 030)

### Data Seeding

- [ ] Email templates seeded (migration 027)
- [ ] Initial admin user created
- [ ] Test provider accounts created (for demo)
- [ ] Subscription plans configured
- [ ] Default security preferences set

### Database Performance

- [ ] Slow query analysis completed
- [ ] Index usage verified
- [ ] RLS policy performance tested
- [ ] Connection pool limits set appropriately

---

## 3. Third-Party Services

### Stripe Configuration

**Payment Processing**
- [ ] Stripe account in production mode
- [ ] Business details completed
- [ ] Bank account verified
- [ ] Payment methods enabled (cards)
- [ ] Currency settings: USD
- [ ] Tax calculation configured (if applicable)

**Stripe Connect (Providers)**
- [ ] Connect platform activated
- [ ] Platform fee structure defined
- [ ] Payout schedule configured
- [ ] Provider onboarding flow tested
- [ ] Express account application reviewed

**Webhooks**
- [ ] Production webhook endpoint added: `https://api.advanciapayledger.com/api/v1/stripe/webhook`
- [ ] Webhook signing secret obtained
- [ ] Events subscribed:
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `charge.refunded`
  - [ ] `account.updated`
  - [ ] `payout.paid`
  - [ ] `payout.failed`
- [ ] Webhook delivery tested
- [ ] Webhook retry logic verified

### Email (Resend)

- [ ] Production API key obtained
- [ ] Domain verified: `advanciapayledger.com`
- [ ] SPF record configured
- [ ] DKIM record configured
- [ ] DMARC record configured
- [ ] Email templates tested:
  - [ ] Welcome email
  - [ ] Password reset
  - [ ] Payment receipt
  - [ ] Appointment confirmation
  - [ ] Invoice notification
- [ ] Bounce handling configured
- [ ] Unsubscribe link tested

### SMS (Twilio)

- [ ] Production account created
- [ ] Phone number purchased
- [ ] SMS service configured
- [ ] Geographic permissions set
- [ ] Message templates tested:
  - [ ] MFA codes
  - [ ] Appointment reminders
  - [ ] Payment notifications
- [ ] Opt-out handling configured
- [ ] Message delivery logs enabled

### Monitoring (Sentry)

- [ ] Production project created
- [ ] DSN configured for backend
- [ ] DSN configured for frontend
- [ ] Source maps uploaded
- [ ] Error grouping configured
- [ ] Alert rules configured:
  - [ ] High error rate (>1%)
  - [ ] Critical errors (payment failures)
  - [ ] Database connection errors
- [ ] Team notifications set up (email/Slack)
- [ ] Performance monitoring enabled

### Redis (Upstash)

- [ ] Production database created
- [ ] Connection string obtained
- [ ] Connection limit appropriate for traffic
- [ ] Memory limit configured
- [ ] Eviction policy set (allkeys-lru)
- [ ] TLS enabled
- [ ] Backup retention configured

---

## 4. Infrastructure Setup

### VPS (Hostinger - 76.13.77.8)

**Initial Setup**
- [ ] SSH access verified
- [ ] Root password changed
- [ ] Non-root user created with sudo
- [ ] SSH key-based authentication enabled
- [ ] Password authentication disabled
- [ ] Fail2ban installed and configured
- [ ] Automatic security updates enabled

**Software Installation**
- [ ] Node.js 22 LTS installed
- [ ] npm updated to latest
- [ ] PM2 installed globally
- [ ] Nginx installed
- [ ] Certbot installed
- [ ] Git installed
- [ ] Build tools installed (gcc, make, etc.)

**Firewall Configuration**
- [ ] UFW enabled
- [ ] SSH port allowed (22 or custom)
- [ ] HTTP allowed (80)
- [ ] HTTPS allowed (443)
- [ ] All other ports blocked
- [ ] Rate limiting configured for SSH

**Application Deployment**
- [ ] Repository cloned to `/var/www/advancia`
- [ ] Dependencies installed (`npm ci --production`)
- [ ] Application built (`npm run build`)
- [ ] Environment file created (`.env`)
- [ ] File permissions set correctly
- [ ] PM2 ecosystem file configured
- [ ] PM2 started and saved
- [ ] PM2 startup script enabled

**Nginx Configuration**
- [ ] Nginx configuration file created
- [ ] Server block configured for API subdomain
- [ ] Proxy headers set correctly
- [ ] Client max body size configured (10MB+)
- [ ] Gzip compression enabled
- [ ] Access logs configured
- [ ] Error logs configured
- [ ] Rate limiting configured
- [ ] Configuration syntax validated
- [ ] Nginx reloaded

**SSL/TLS Setup**
- [ ] Certbot certificates obtained
- [ ] Auto-renewal configured
- [ ] HTTPS redirect enabled
- [ ] TLS 1.2+ enforced
- [ ] Strong cipher suites configured
- [ ] HSTS header enabled
- [ ] Certificate expiry monitoring set up

### DNS (Cloudflare)

**Domain Configuration**
- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS propagation verified

**DNS Records**
- [ ] A record: `api.advanciapayledger.com` → `76.13.77.8` (Proxy OFF)
- [ ] CNAME record: `www` → `advanciapayledger.com`
- [ ] CNAME record: `app` → Vercel
- [ ] MX records for email (if using custom email)
- [ ] TXT record: SPF
- [ ] TXT record: DKIM
- [ ] TXT record: DMARC

**Cloudflare Settings**
- [ ] SSL/TLS mode: Full (Strict)
- [ ] Always Use HTTPS: On
- [ ] Automatic HTTPS Rewrites: On
- [ ] HTTP Strict Transport Security: Enabled
- [ ] Minimum TLS Version: 1.2
- [ ] TLS 1.3: Enabled
- [ ] Universal SSL: Active

**Security Settings**
- [ ] Security level: Medium (adjust based on traffic)
- [ ] Bot Fight Mode: Enabled
- [ ] Challenge passage: 30 minutes
- [ ] Browser integrity check: On
- [ ] Rate limiting rules configured
- [ ] Firewall rules configured (if needed)

**Performance**
- [ ] Caching level: Standard
- [ ] Browser cache TTL: Respect existing headers
- [ ] Auto Minify: HTML, CSS, JS
- [ ] Brotli compression: Enabled
- [ ] Rocket Loader: Disabled (may interfere with React)

### Frontend (Vercel)

- [ ] Project imported from GitHub
- [ ] Build settings configured:
  - Framework Preset: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`
- [ ] Environment variables configured
- [ ] Custom domain added: `advanciapayledger.com`
- [ ] DNS configured for custom domain
- [ ] SSL certificate issued
- [ ] Production deployment successful
- [ ] Preview deployments enabled
- [ ] Auto-deploy on push to `main` enabled

---

## 5. Testing & Validation

### Backend API Testing

**Health Checks**
- [ ] `GET /health` returns 200 OK
- [ ] Database connection verified
- [ ] Monitoring service connected
- [ ] Redis connection verified (if configured)

**Authentication Endpoints**
- [ ] User registration works
- [ ] Email verification works
- [ ] Login works (password)
- [ ] Login works (OAuth - if configured)
- [ ] Password reset flow works
- [ ] Token refresh works
- [ ] Logout works
- [ ] MFA enrollment works
- [ ] MFA verification works

**Payment Endpoints**
- [ ] Create payment intent works
- [ ] Retrieve payment intent works
- [ ] Confirm payment works
- [ ] List transactions works
- [ ] Create refund works
- [ ] Stripe webhook receives events
- [ ] Webhook signature verification works

**Provider Endpoints**
- [ ] Provider onboarding flow works
- [ ] Stripe Connect account creation works
- [ ] Account link generation works
- [ ] Dashboard link generation works
- [ ] Balance retrieval works

**Admin Endpoints**
- [ ] Dashboard stats accessible (admin only)
- [ ] Transaction list accessible
- [ ] Dispute management works
- [ ] Analytics reports generate

**Security Testing**
- [ ] Unauthorized requests return 401
- [ ] Forbidden actions return 403
- [ ] CSRF protection active
- [ ] Rate limiting works on all tiers
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CORS policy enforced correctly

### Frontend Testing

**Page Load Testing**
- [ ] Home page loads
- [ ] Login page loads
- [ ] Dashboard loads (authenticated)
- [ ] Payment page loads
- [ ] Provider dashboard loads
- [ ] Admin console loads

**User Flows**
- [ ] User registration flow completes
- [ ] User login flow completes
- [ ] Password reset flow completes
- [ ] Profile update works
- [ ] Appointment booking works
- [ ] Payment processing works
- [ ] Provider onboarding works

**Browser Compatibility**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

**Performance**
- [ ] Lighthouse score > 90 (Performance)
- [ ] Lighthouse score > 90 (Accessibility)
- [ ] Lighthouse score > 90 (Best Practices)
- [ ] Lighthouse score > 90 (SEO)
- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.8s
- [ ] Total bundle size < 500KB (gzipped)

### End-to-End Testing

- [ ] Playwright tests pass in CI/CD
- [ ] Complete user journey tested (signup → payment → completion)
- [ ] Provider journey tested (onboarding → receiving payment)
- [ ] Admin workflow tested

### Load Testing

- [ ] API can handle 100 concurrent users
- [ ] Response time < 200ms under normal load
- [ ] Response time < 500ms under peak load
- [ ] No memory leaks detected after 1 hour
- [ ] Database connection pool doesn't overflow

---

## 6. Security Audit

### Application Security

- [x] All dependencies updated
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] Secrets not exposed in client-side code
- [ ] Error messages don't leak sensitive info
- [ ] File upload validation implemented
- [ ] File size limits enforced
- [ ] Input sanitization on all user inputs
- [ ] Output encoding prevents XSS
- [ ] SQL injection prevention (parameterized queries)
- [ ] Command injection prevention
- [ ] Path traversal prevention

### Authentication & Authorization

- [x] Password requirements enforced (min 8 chars)
- [x] Passwords hashed with bcrypt (Supabase Auth)
- [x] JWT tokens expire appropriately
- [x] Refresh tokens securely stored
- [x] Session management secure
- [x] MFA available for sensitive accounts
- [x] Role-based access control enforced
- [x] Row Level Security active on all tables

### API Security

- [x] HTTPS enforced
- [x] CORS properly configured
- [x] CSRF protection enabled
- [x] Rate limiting active
- [x] Request size limits enforced
- [x] Security headers configured (Helmet.js)
- [ ] API versioning in place
- [ ] Deprecated endpoints documented

### Infrastructure Security

- [ ] VPS hardened:
  - [ ] SSH keys only (no password auth)
  - [ ] Fail2ban active
  - [ ] UFW configured
  - [ ] Automatic security updates
  - [ ] Non-root user for application
- [ ] Database security:
  - [ ] Strong passwords
  - [ ] Connection encryption (SSL)
  - [ ] No public internet access (unless required)
  - [ ] Regular backups
- [ ] Secrets management:
  - [ ] Environment variables only (no hardcoded secrets)
  - [ ] Supabase Vault for sensitive data
  - [ ] Secrets rotated regularly

### Compliance

- [ ] HIPAA compliance checklist completed
- [ ] Privacy policy published and linked
- [ ] Terms of service published and linked
- [ ] Cookie consent banner implemented
- [ ] GDPR requirements met (if applicable):
  - [ ] Data export functionality
  - [ ] Data deletion functionality
  - [ ] Consent management
- [ ] Audit logging functional
- [ ] Data retention policy defined

---

## 7. Monitoring & Alerting

### Application Monitoring

- [ ] Sentry error tracking active
- [ ] Error rate alerts configured
- [ ] Performance monitoring enabled
- [ ] Custom metrics tracked:
  - [ ] Transaction volume
  - [ ] Payment success rate
  - [ ] API response times
  - [ ] Active users

### Infrastructure Monitoring

- [ ] Server CPU usage monitored
- [ ] Server memory usage monitored
- [ ] Disk space monitored
- [ ] Network traffic monitored
- [ ] PM2 monitoring dashboard accessible

### Database Monitoring

- [ ] Query performance tracked (Supabase Dashboard)
- [ ] Connection pool usage monitored
- [ ] Slow query alerts configured
- [ ] Database size monitored
- [ ] RLS policy performance monitored

### Uptime Monitoring

- [ ] External uptime monitor configured:
  - Service options: UptimeRobot, Pingdom, Better Uptime
  - [ ] API health check monitored (5-minute interval)
  - [ ] Frontend monitored
  - [ ] Response time tracking enabled
- [ ] Status page created (if applicable)
- [ ] Downtime alerts configured:
  - [ ] Email notifications
  - [ ] SMS notifications (critical only)
  - [ ] Slack notifications

### Log Management

- [ ] Application logs structured (JSON)
- [ ] Log aggregation configured (optional: Logtail, Papertrail)
- [ ] Log retention policy defined
- [ ] Log rotation configured
- [ ] Sensitive data not logged (passwords, tokens)

### Alert Routing

- [ ] Critical alerts → SMS + Email
- [ ] High priority alerts → Email
- [ ] Low priority alerts → Dashboard only
- [ ] On-call rotation defined (if applicable)
- [ ] Alert fatigue prevention (de-duplication, thresholds)

---

## 8. Documentation

### Technical Documentation

- [x] README.md complete and up-to-date
- [x] ARCHITECTURE.md created with diagrams
- [x] DEPLOYMENT.md updated with production steps
- [x] SECURITY.md reviewed
- [x] DEV_SETUP.md for developers
- [ ] API documentation (Swagger) accessible at `/docs`
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Deployment runbook created
- [ ] Incident response plan documented
- [ ] Disaster recovery plan documented

### User Documentation

- [ ] User guide created
- [ ] Provider onboarding guide created
- [ ] Admin manual created
- [ ] FAQ page published
- [ ] Help center or knowledge base (optional)
- [ ] Video tutorials (optional)

### Operational Documentation

- [ ] Deployment checklist (this document)
- [ ] Rollback procedure documented
- [ ] Backup restoration procedure documented
- [ ] Scaling guide created
- [ ] Performance tuning guide created
- [ ] Troubleshooting guide created

---

## 9. Business Readiness

### Legal & Compliance

- [ ] Terms of Service reviewed by legal counsel
- [ ] Privacy Policy reviewed by legal counsel
- [ ] HIPAA Business Associate Agreement (BAA) signed with Supabase
- [ ] Payment processor agreement signed (Stripe)
- [ ] Insurance obtained (cyber liability, E&O)

### Payment Processing

- [ ] Merchant account approved
- [ ] Payment flow tested end-to-end
- [ ] Refund process documented and tested
- [ ] Chargeback handling process defined
- [ ] Accounting integration configured (if applicable)
- [ ] Tax calculation verified (if applicable)

### Customer Support

- [ ] Support email configured: support@advanciapayledger.com
- [ ] Support ticket system set up (optional)
- [ ] Support team trained
- [ ] Escalation process defined
- [ ] SLA defined and communicated

### Marketing & Communications

- [ ] Landing page live with correct CTA links
- [ ] Social media accounts created
- [ ] Email marketing platform configured (if applicable)
- [ ] Launch announcement prepared
- [ ] Press release drafted (if applicable)

---

## 10. Go-Live Preparation

### Pre-Launch Actions

- [ ] Final backup of all systems
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan confirmed
- [ ] Team availability confirmed
- [ ] Communication plan for launch status updates

### Launch Day Checklist

1. [ ] **T-2 hours**: Final system health check
2. [ ] **T-1 hour**: Enable production traffic
3. [ ] **T-0**: Announce go-live to team
4. [ ] **T+15 min**: Verify all monitoring alerts are working
5. [ ] **T+30 min**: Check error rates in Sentry
6. [ ] **T+1 hour**: Review server logs for anomalies
7. [ ] **T+2 hours**: Test critical user flows
8. [ ] **T+4 hours**: Performance review meeting
9. [ ] **T+24 hours**: Post-launch review meeting

### Post-Launch Monitoring (First Week)

- [ ] Daily error rate review
- [ ] Daily performance review
- [ ] User feedback collection
- [ ] Support ticket analysis
- [ ] Payment processing validation
- [ ] Security incident review

---

## 11. Known Issues & Technical Debt

### To-Do Items

- [ ] Implement crypto payment support (mentioned on landing page but not in app)
- [ ] Add comprehensive integration tests
- [ ] Improve test coverage to >80%
- [ ] Add API response caching for frequently accessed data
- [ ] Implement rate limiting per user (currently per IP)
- [ ] Add request/response compression
- [ ] Optimize database queries (add missing indexes)
- [ ] Implement database connection pooling tuning
- [ ] Add graceful shutdown handling
- [ ] Implement circuit breaker for external API calls
- [ ] Add API versioning support
- [ ] Implement webhook retry logic
- [ ] Add observability (OpenTelemetry/Jaeger)

### Future Enhancements

- [ ] Mobile app (React Native or Flutter)
- [ ] Provider mobile app
- [ ] Advanced analytics dashboard
- [ ] Machine learning for fraud detection
- [ ] Multi-language support (i18n)
- [ ] White-label solution for partners
- [ ] API marketplace/ecosystem

---

## 12. Rollback Plan

### If Issues Are Detected Post-Launch

**Level 1: Minor Issues (non-critical)**
- Monitor closely
- Create hotfix if necessary
- Deploy during maintenance window

**Level 2: Moderate Issues (affecting some users)**
1. Put system in maintenance mode
2. Investigate root cause
3. Apply hotfix or rollback to previous version
4. Communicate with affected users

**Level 3: Critical Issues (system down or data corruption)**
1. **Immediate**: Enable maintenance mode
2. **Minute 0-5**: Notify team, assess severity
3. **Minute 5-15**: Decision to fix forward or rollback
4. **Rollback procedure**:
   ```bash
   # On VPS
   cd /var/www/advancia
   git checkout <previous-stable-commit>
   npm ci
   npm run build
   pm2 reload ecosystem.config.cjs
   ```
5. **Database rollback** (if needed):
   - Restore from Supabase backup
   - Verify data integrity
6. **Post-rollback**:
   - Verify system functionality
   - Communicate status to users
   - Post-mortem meeting within 24 hours

---

## 13. Sign-Off

### Technical Team

- [ ] **Backend Lead**: Verified all backend systems operational
  - Name: _______________ Date: _______________

- [ ] **Frontend Lead**: Verified all frontend systems operational
  - Name: _______________ Date: _______________

- [ ] **DevOps Lead**: Verified all infrastructure operational
  - Name: _______________ Date: _______________

- [ ] **QA Lead**: Verified all testing completed successfully
  - Name: _______________ Date: _______________

- [ ] **Security Lead**: Verified security audit completed
  - Name: _______________ Date: _______________

### Management

- [ ] **Product Manager**: Approved for production launch
  - Name: _______________ Date: _______________

- [ ] **CTO/Technical Director**: Final approval
  - Name: _______________ Date: _______________

---

## 14. Support Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | contact@example.com | 24/7 |
| DevOps Lead | contact@example.com | Business hours |
| Security Team | security@advanciapayledger.com | 24/7 |
| Supabase Support | https://supabase.com/support | 24/7 (Enterprise) |
| Stripe Support | https://support.stripe.com | 24/7 |
| Hostinger Support | https://www.hostinger.com/contact | 24/7 |

---

## 15. Additional Resources

- **Production Dashboard**: [Supabase Dashboard](https://app.supabase.com/project/pikguczsvikzragmrojz)
- **Monitoring**: [Sentry Dashboard](https://sentry.io/)
- **Payment Dashboard**: [Stripe Dashboard](https://dashboard.stripe.com/)
- **DNS Management**: [Cloudflare Dashboard](https://dash.cloudflare.com/)
- **Repository**: [GitHub - modullar-advancia](https://github.com/pdtribe181-prog/modullar-advancia)
- **PM2 Web Dashboard**: `pm2 web` (alternative monitoring)

---

**Completion Date**: _______________  
**Go-Live Date**: _______________  
**Post-Launch Review Date**: _______________

---

**Notes**:
- This checklist should be updated after each deployment
- Items marked with [x] are verified complete
- Items marked with [ ] require action
- Any blocked items should be documented with reason and mitigation plan
