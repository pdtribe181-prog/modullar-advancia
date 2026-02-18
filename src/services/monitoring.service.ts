/**
 * Monitoring Service
 * Integrates Sentry for error tracking, performance monitoring, and alerting
 */

import * as Sentry from '@sentry/node';
import type { Event, ErrorEvent } from '@sentry/types';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../middleware/logging.middleware.js';

interface MonitoringConfig {
  dsn: string | undefined;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

// Initialize Sentry with configuration
export function initializeMonitoring(config: MonitoringConfig): void {
  if (!config.dsn) {
    logger.warn('Sentry DSN not configured - monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release || `modullar-advancia@${process.env.npm_package_version || '1.0.0'}`,

    // Performance monitoring
    tracesSampleRate: config.tracesSampleRate ?? (config.environment === 'production' ? 0.1 : 1.0),

    // Filter sensitive data
    beforeSend(event: ErrorEvent) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'secret', 'card', 'cvv', 'ssn'];
        try {
          const data =
            typeof event.request.data === 'string'
              ? JSON.parse(event.request.data)
              : event.request.data;

          for (const field of sensitiveFields) {
            if (data && data[field]) {
              data[field] = '[REDACTED]';
            }
          }
          event.request.data = JSON.stringify(data);
        } catch {
          // Ignore JSON parse errors
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Ignore rate limiting errors (expected behavior)
      'Too many requests',
      // Ignore canceled requests
      'AbortError',
      // Ignore network errors from client disconnects
      'ECONNRESET',
    ],
  });

  logger.info('Sentry monitoring initialized', { environment: config.environment });
}

// Express error handler for Sentry - custom implementation for SDK 8.x
export function sentryErrorHandler(
  error: Error & { status?: number },
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Report all 5xx errors
  const shouldReport =
    !error.status ||
    error.status >= 500 ||
    (error.status >= 400 && error.status < 500 && ![401, 403, 404, 429].includes(error.status));

  if (shouldReport) {
    Sentry.captureException(error);
  }
  next(error);
}

// Express request handler for automatic tracing - custom implementation for SDK 8.x
export function sentryRequestHandler(req: Request, _res: Response, next: NextFunction): void {
  // Add request context as breadcrumb
  Sentry.addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.url}`,
    level: 'info',
    data: {
      method: req.method,
      url: req.url,
      query: req.query,
    },
  });
  next();
}

// Express tracing handler - placeholder for SDK 8.x
export function sentryTracingHandler(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

// Custom error capture with context
export function captureError(
  error: Error,
  context?: {
    user?: { id: string; email?: string };
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
): string {
  return Sentry.captureException(error, {
    user: context?.user,
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level,
  });
}

// Capture a message (for non-error events)
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): string {
  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

// Add breadcrumb for debugging
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

// Set user context for error tracking
export function setUser(user: { id: string; email?: string; role?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

// Start a transaction for performance monitoring
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startInactiveSpan> {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

// Middleware to add user context from authenticated requests
export function userContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (user) {
    setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
  next();
}

// Health check for monitoring status
export function getMonitoringHealth(): { enabled: boolean; dsn: boolean } {
  const client = Sentry.getClient();
  return {
    enabled: !!client,
    dsn: !!client?.getDsn(),
  };
}

// Flush events before shutdown
export async function flushEvents(timeout = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

// Export Sentry for direct access if needed
export { Sentry };
