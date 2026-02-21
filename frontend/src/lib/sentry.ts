/**
 * Sentry Monitoring for Frontend
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

interface SentryConfig {
  dsn: string | undefined;
  environment: string;
  release?: string;
}

// Initialize Sentry
export function initSentry(config: SentryConfig): void {
  if (!config.dsn) {
    if (import.meta.env.DEV) console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release:
      config.release || `modullar-advancia-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Performance monitoring
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        // Session replay for debugging
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Sample rates
    tracesSampleRate: config.environment === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter sensitive data
    beforeSend(event: Sentry.ErrorEvent) {
      // Remove sensitive user data
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // Browser extensions
      'chrome-extension://',
      'moz-extension://',
      // Third-party scripts
      'Script error.',
      // User-initiated actions
      'AbortError',
    ],
  });

  if (import.meta.env.DEV) console.log('Sentry initialized for frontend');
}

// Error boundary wrapper component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Wrap with profiler for component performance tracking
export const withSentryProfiler = Sentry.withProfiler;

// Manual error capture
export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Set user context
export function setUser(user: { id: string; email?: string } | null): void {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Create custom spans for performance monitoring
export function startSpan<T>(name: string, fn: () => T): T {
  return Sentry.startSpan({ name, op: 'function' }, fn);
}

// Export Sentry for direct access if needed
export { Sentry };
