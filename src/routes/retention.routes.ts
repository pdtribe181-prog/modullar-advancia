/**
 * Data Retention Routes
 *
 * Admin-only endpoints for managing data retention policies:
 *
 *   GET  /retention/policies   — List all configured retention policies
 *   POST /retention/enforce    — Manually trigger retention enforcement
 *   GET  /retention/history    — View past enforcement runs
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import { auditAdmin } from '../middleware/audit.middleware.js';
import {
  getRetentionPolicySummary,
  enforceRetentionPolicies,
} from '../services/data-retention.service.js';
import { createServiceClient } from '../lib/supabase.js';

const router = Router();

// ────────────────────────────────────────────────────────────
// GET /retention/policies — list configured retention policies
// ────────────────────────────────────────────────────────────

router.get(
  '/policies',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Any authenticated user can view policies (transparency)
    const policies = getRetentionPolicySummary();

    res.json({
      success: true,
      data: policies,
      meta: { total: policies.length },
    });
  })
);

// ────────────────────────────────────────────────────────────
// POST /retention/enforce — manually run retention policies
// ────────────────────────────────────────────────────────────

router.post(
  '/enforce',
  authenticate,
  sensitiveLimiter,
  auditAdmin('retention_enforce'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = req.userProfile as any;
    if (profile?.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const results = await enforceRetentionPolicies();

    const totalAffected = results.reduce((sum, r) => sum + r.rowsAffected, 0);
    const errors = results.filter((r) => r.error);

    res.json({
      success: true,
      data: {
        policiesRun: results.length,
        totalRowsAffected: totalAffected,
        errors: errors.length,
        results,
      },
    });
  })
);

// ────────────────────────────────────────────────────────────
// GET /retention/history — past enforcement runs
// ────────────────────────────────────────────────────────────

router.get(
  '/history',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const profile = req.userProfile as any;
    if (profile?.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('compliance_logs')
      .select('*')
      .eq('action', 'data_retention_enforcement')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new AppError('Failed to fetch retention history', 500);

    res.json({
      success: true,
      data: data ?? [],
    });
  })
);

export default router;
