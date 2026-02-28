/**
 * Audit Logging Middleware
 *
 * Automatically records access audit logs and compliance logs for
 * sensitive API operations. Integrates with the existing
 * `access_audit_logs`, `compliance_logs`, and `security_events` tables
 * defined in migration 006.
 *
 * Usage:
 *   router.post('/payments', authenticate, auditLog('payment.create'), handler)
 *
 * The middleware captures:
 *  - Who? (user_id from req.user)
 *  - What? (action label, HTTP method, path)
 *  - Where? (IP, user-agent, session)
 *  - Result? (response status, duration)
 *  - Context? (resource type/id extracted from route params)
 */

import { Response, NextFunction, Request } from 'express';
import { createServiceClient } from '../lib/supabase.js';
import { logger } from './logging.middleware.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface AuditOptions {
  /** Free-form action label, e.g. 'payment.create', 'user.delete' */
  action: string;
  /** Resource type for structured querying (optional — auto-inferred from path) */
  resourceType?: string;
  /** Whether to write a compliance_logs entry in addition to access_audit_logs */
  compliance?: boolean;
  /** Severity level — high/critical actions generate security_events too */
  severity?: 'low' | 'medium' | 'high' | 'critical';
  /** Extract extra metadata from the request (runs after the handler) */
  extractMeta?: (req: Request, res: Response) => Record<string, unknown>;
}

// ── Sensitive action map — auto-tagged for compliance logging ──────────

const COMPLIANCE_ACTIONS = new Set([
  // Auth
  'auth.login',
  'auth.logout',
  'auth.register',
  'auth.password_reset',
  'auth.mfa_enroll',
  'auth.mfa_verify',
  // Payments
  'payment.create',
  'payment.refund',
  'payment.capture',
  // Admin
  'admin.user_update',
  'admin.role_change',
  'admin.settings_update',
  // Data
  'gdpr.export',
  'gdpr.erasure',
  'gdpr.consent_update',
  // Provider
  'provider.onboard',
  'provider.payout',
  // Upload
  'upload.medical_record',
  'upload.document',
  // Security
  'security.api_key_create',
  'security.api_key_revoke',
]);

const HIGH_SEVERITY_ACTIONS = new Set([
  'gdpr.erasure',
  'admin.role_change',
  'admin.user_update',
  'security.api_key_create',
  'security.api_key_revoke',
  'payment.refund',
]);

// ── Helpers ────────────────────────────────────────────────────────────

function inferResourceType(path: string): string {
  // /api/v1/payments/:id → 'payments'
  const segments = path.replace(/^\/api\/v1\//, '').split('/');
  return segments[0] || 'unknown';
}

function extractResourceId(req: Request): string | null {
  // First named :id-style param that looks like a UUID
  const params = req.params ?? {};
  for (const val of Object.values(params)) {
    if (typeof val === 'string' && /^[0-9a-f-]{36}$/i.test(val)) return val;
  }
  return null;
}

// ── Middleware factory ──────────────────────────────────────────────────

/**
 * Returns an Express middleware that logs the request to `access_audit_logs`
 * (and optionally `compliance_logs` / `security_events`).
 *
 * The write happens **after** the response is sent (via `res.on('finish')`)
 * so it never slows down the response.
 */
export function auditLog(actionOrOpts: string | AuditOptions) {
  const opts: AuditOptions =
    typeof actionOrOpts === 'string' ? { action: actionOrOpts } : actionOrOpts;

  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Fire-and-forget after response completes
    res.on('finish', () => {
      const duration = Date.now() - start;

      writeAuditRecord(req, res, opts, duration);
    });

    next();
  };
}

async function writeAuditRecord(
  req: Request,
  res: Response,
  opts: AuditOptions,
  durationMs: number
) {
  try {
    const user = (req as any).user;
    const userId: string | null = user?.id ?? null;
    const resourceType = opts.resourceType ?? inferResourceType(req.path);
    const resourceId = extractResourceId(req);
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      null;
    const userAgent = req.headers['user-agent'] ?? null;
    const sessionId = (req as any).sessionId ?? req.headers['x-session-id'] ?? null;
    const accessGranted = res.statusCode < 400;
    const denialReason = !accessGranted ? `HTTP ${res.statusCode}` : null;
    const extraMeta = opts.extractMeta ? opts.extractMeta(req, res) : {};

    const sb = createServiceClient();

    // 1. Always insert into access_audit_logs
    const auditPayload = {
      user_id: userId,
      action: opts.action,
      resource_type: resourceType,
      resource_id: resourceId,
      access_granted: accessGranted,
      denial_reason: denialReason,
      ip_address: ip,
      user_agent: userAgent,
      session_id: sessionId,
      request_method: req.method,
      request_path: req.originalUrl,
      response_status: res.statusCode,
      duration_ms: durationMs,
      metadata: {
        ...extraMeta,
        requestId: (req as any).id,
      },
    };

    const promises: Promise<any>[] = [sb.from('access_audit_logs').insert(auditPayload) as any];

    // 2. Compliance log for sensitive operations
    const isComplianceAction = opts.compliance === true || COMPLIANCE_ACTIONS.has(opts.action);

    if (isComplianceAction) {
      promises.push(
        sb.from('compliance_logs').insert({
          user_id: userId,
          action: opts.action,
          resource_type: resourceType,
          resource_id: resourceId,
          ip_address: ip,
          user_agent: userAgent,
          details: {
            response_status: res.statusCode,
            duration_ms: durationMs,
            ...extraMeta,
          },
          status: accessGranted ? 'success' : 'failure',
          error_message: !accessGranted ? denialReason : null,
          request_method: req.method,
          request_path: req.originalUrl,
          response_status: res.statusCode,
        }) as any
      );
    }

    // 3. Security events for high-severity actions
    const severity = opts.severity ?? (HIGH_SEVERITY_ACTIONS.has(opts.action) ? 'high' : undefined);
    if (severity === 'high' || severity === 'critical') {
      promises.push(
        sb.from('security_events').insert({
          user_id: userId,
          event_type: opts.action,
          severity,
          ip_address: ip,
          user_agent: userAgent,
          details: {
            resource_type: resourceType,
            resource_id: resourceId,
            response_status: res.statusCode,
            ...extraMeta,
          },
        }) as any
      );
    }

    await Promise.allSettled(promises);
  } catch (err) {
    // Never let audit failures affect the request
    logger.error('Audit log write failed', undefined, { error: String(err), action: opts.action });
  }
}

// ── Convenience pre-configured middleware ───────────────────────────────

/** Audit middleware for auth-related actions */
export const auditAuth = (action: string) =>
  auditLog({ action: `auth.${action}`, compliance: true });

/** Audit middleware for payment-related actions */
export const auditPayment = (action: string) =>
  auditLog({ action: `payment.${action}`, compliance: true });

/** Audit middleware for admin actions (high severity) */
export const auditAdmin = (action: string) =>
  auditLog({ action: `admin.${action}`, compliance: true, severity: 'high' });

/** Audit middleware for GDPR actions (high severity) */
export const auditGdpr = (action: string) =>
  auditLog({ action: `gdpr.${action}`, compliance: true, severity: 'high' });
