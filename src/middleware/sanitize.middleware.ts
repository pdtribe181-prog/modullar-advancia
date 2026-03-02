/**
 * Input Sanitization Middleware
 * Strips HTML tags from string fields in request bodies to prevent stored XSS.
 * Defense-in-depth: React escapes output by default, but we also sanitize on ingress.
 *
 * CodeQL js/incomplete-multi-character-sanitization (CWE-116): entity and tag removal
 * are applied in a loop until fixed point so removed multi-char sequences cannot reappear.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * HTML entity forms for < and > (no decode step — we remove, never emit raw < or >).
 * Covers named, decimal, hex; semicolon optional (HTML5).
 * CodeQL: multi-char sanitization must be applied repeatedly so removed text cannot reappear.
 */
const ANGLE_ENTITY_PATTERN =
  /&(?:lt|gt|#x3[Cc]|#x0*3[Cc]|#60|#0*60|#62|#0*62|#x3[Ee]|#x0*3[Ee]);?/gi;

/** Match HTML tags for removal. Applied in a loop to satisfy CodeQL (incomplete multi-char sanitization). */
const HTML_TAG_PATTERN = /<[^>]*>/g;

/**
 * Strip HTML tags from a string.
 * Neutralizes entity forms for < and > (no decode), strips tags, then escapes remaining angle brackets.
 * Uses repeated replacement until fixed point so no unsafe multi-char sequence can reappear (CodeQL CWE-116).
 */
export function stripHtmlTags(input: string): string {
  let s = input.trim();
  let prev: string;
  // Remove angle-bracket entities until none left (avoids incomplete multi-char sanitization)
  do {
    prev = s;
    s = s.replace(ANGLE_ENTITY_PATTERN, '');
  } while (s !== prev);
  // Strip tags until none left (removed content cannot form new tags)
  do {
    prev = s;
    s = s.replace(HTML_TAG_PATTERN, '');
  } while (s !== prev);
  // Escape any remaining angle brackets (single-char replace is safe after above)
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Recursively sanitize all string values in an object.
 * Preserves structure (objects, arrays, numbers, booleans, null).
 * Skips fields in the allowlist (e.g., password fields that shouldn't be modified).
 */
function sanitizeValue(
  value: unknown,
  skipFields: Set<string> = new Set(),
  currentKey = ''
): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    // Don't sanitize skip-listed fields (passwords, tokens, etc.)
    if (skipFields.has(currentKey)) return value;
    return stripHtmlTags(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, skipFields, `${currentKey}[${index}]`));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val, skipFields, key);
    }
    return sanitized;
  }

  // Numbers, booleans, etc. — pass through
  return value;
}

/**
 * Fields that should NOT be sanitized (contain special characters by design).
 */
const SKIP_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'mfaCode',
  'totp',
  'signature',
  'webhookSecret',
  'apiKey',
]);

/**
 * Express middleware that sanitizes all string values in req.body.
 * Should be applied AFTER body parsing and BEFORE route handlers.
 *
 * Excluded paths:
 *  - Stripe webhook (uses raw body)
 *  - Any path where body is not JSON
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  // Skip if no body or body is a Buffer (e.g., Stripe webhook raw body)
  if (!req.body || Buffer.isBuffer(req.body) || typeof req.body !== 'object') {
    return next();
  }

  req.body = sanitizeValue(req.body, SKIP_FIELDS);
  next();
}
