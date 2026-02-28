/**
 * Metrics Middleware
 *
 * Attaches to every request and records latency + status code to
 * the in-memory metrics service on response finish.
 *
 * Also extracts the authenticated user ID when available so the
 * active-user counters stay accurate.
 */

import type { Request, Response, NextFunction } from 'express';
import { recordRequest } from '../services/metrics.service.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const userId = (req as any).user?.id as string | undefined;
    recordRequest(req.method, req.originalUrl || req.url, res.statusCode, durationMs, userId);
  });

  next();
}
