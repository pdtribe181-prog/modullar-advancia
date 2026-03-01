# Security Policy — Modullar Advancia

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | ✅ Active |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue.
2. Email **<security@advanciapayledger.com>** with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
3. You will receive a response within **48 hours**.
4. We will work with you to understand and address the issue before any public disclosure.

## Security Practices

### Secrets Management

- All secrets (API keys, database credentials, tokens) are stored in environment variables.
- `.env`, `.env.production`, and `.env*.local` files are excluded from version control via `.gitignore`.
- Production secrets are managed via environment variables on Render (backend) and Hostinger Horizons (frontend).
- **Never** commit real API keys, tokens, or passwords to source code.

### Authentication & Authorization

- All sensitive API endpoints require JWT authentication via Supabase Auth.
- Role-based access control (RBAC) enforces `admin`, `provider`, `billing`, and `patient` roles.
- IDOR protection ensures users can only access their own resources (unless admin/provider role).
- Row Level Security (RLS) policies are enabled on all database tables.

### Data Protection

- All data in transit is encrypted via TLS/HTTPS.
- Supabase handles encryption at rest for PostgreSQL.
- HIPAA compliance measures are implemented for healthcare data.
- Content Security Policy (CSP) headers are enforced.

### Rate Limiting

- Authentication endpoints: 5 requests/15 minutes
- Payment endpoints: 10 requests/minute
- General API: 100 requests/15 minutes
- Webhook endpoints: separate rate limits

### Dependencies

- Dependencies are audited on every CI run (`npm audit --omit=dev`).
- Dependabot is enabled for automated security updates.
- Only production dependencies are included in Docker builds.
