/**
 * Metrics Routes
 *
 * GET  /metrics           — Prometheus-compatible text format (for scrapers)
 * GET  /metrics/json      — Full JSON snapshot (for admin dashboards)
 * POST /metrics/persist   — Force-persist snapshot to DB (admin-only)
 */

import { Router } from 'express';
import {
  getMetricsSnapshot,
  getPrometheusMetrics,
  persistMetrics,
} from '../services/metrics.service.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Prometheus-style text output (no auth — meant for monitoring scrapers with IP allowlist)
router.get('/', (_req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(getPrometheusMetrics());
});

// JSON snapshot — admin only
router.get('/json', authenticate, requireRole('admin'), (_req, res) => {
  res.json(getMetricsSnapshot());
});

// Manual persist — admin only
router.post('/persist', authenticate, requireRole('admin'), async (_req, res) => {
  await persistMetrics();
  res.json({ status: 'persisted' });
});

export default router;
