/**
 * Input Sanitization Middleware
 * Strips HTML tags from string fields in request bodies to prevent stored XSS.
 * Defense-in-depth: React escapes output by default, but we also sanitize on ingress.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Neutralize HTML entity forms for angle brackets (single pass, no decode-to-raw).
 * Prevents incomplete multi-character sanitization by never emitting < or > from entities.
 */
const ANGLE_ENTITY_PATTERN = /&(?:lt|gt|#x3[Cc]|#60|#062|#x3[Ee]|#62|#063);/gi;

/**
 * Strip HTML tags from a string.
 * Neutralizes entity forms for < and > (no decode step), strips tags, then escapes remaining angle brackets.
 */
export function stripHtmlTags(input: string): string {
  return (
    input
      // Remove angle-bracket entities without decoding (avoids incomplete multi-char sanitization)
      .replace(ANGLE_ENTITY_PATTERN, '')
      // Strip all HTML tags
      .replace(/<[^>]*>/g, '')
      // Escape any remaining angle brackets
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim()
  );
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
