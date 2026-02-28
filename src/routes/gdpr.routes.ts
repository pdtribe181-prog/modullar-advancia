/**
 * GDPR Compliance Routes
 *
 * Implements the data subject rights required by the EU General Data
 * Protection Regulation (GDPR):
 *
 *   GET  /gdpr/export          – Data export (Art. 15 / 20)
 *   POST /gdpr/erasure         – Data erasure request (Art. 17)
 *   GET  /gdpr/consents        – List consent records
 *   PUT  /gdpr/consents        – Grant / revoke a specific consent
 *
 * All endpoints are authenticated. Erasure requires the user to confirm
 * by providing `{ confirmDeletion: true }` in the body. Admins may
 * perform erasure on behalf of another user by passing `userId`.
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import {
  exportUserData,
  eraseUserData,
  getConsents,
  updateConsent,
} from '../services/gdpr.service.js';
import { createServiceClient } from '../lib/supabase.js';

const router = Router();

// ────────────────────────────────────────────────────────────
// GET /gdpr/export — full personal data export
// ────────────────────────────────────────────────────────────

router.get(
  '/export',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    logger.info('GDPR data export requested', { userId });

    // Compliance log
    const sb = createServiceClient();
    await sb.from('compliance_logs').insert({
      user_id: userId,
      action: 'gdpr_data_export',
      details: { requestedAt: new Date().toISOString() },
    });

    const exportPackage = await exportUserData(userId);

    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gdpr-export-${userId.slice(0, 8)}-${Date.now()}.json"`
    );
    res.json({ success: true, data: exportPackage });
  })
);

// ────────────────────────────────────────────────────────────
// POST /gdpr/erasure — right to be forgotten
// ────────────────────────────────────────────────────────────

router.post(
  '/erasure',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const requesterId = req.user!.id;
    const { confirmDeletion, userId: targetUserId } = req.body;

    if (!confirmDeletion) {
      throw new AppError(
        'You must set confirmDeletion: true to proceed with data erasure',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    // Determine whose data to erase
    let userToErase = requesterId;

    if (targetUserId && targetUserId !== requesterId) {
      // Only admins can erase another user's data
      const sb = createServiceClient();
      const { data: profile } = await sb
        .from('user_profiles')
        .select('role')
        .eq('id', requesterId)
        .single();

      if (profile?.role !== 'admin') {
        throw new AppError('Only admins can perform erasure for other users', 403, 'FORBIDDEN');
      }
      userToErase = targetUserId;
    }

    logger.info('GDPR erasure requested', {
      requestedBy: requesterId,
      targetUser: userToErase,
    });

    const result = await eraseUserData(userToErase, requesterId);

    logger.info('GDPR erasure completed', {
      targetUser: userToErase,
      tablesProcessed: result.tablesProcessed.length,
      storageCleared: result.storageCleared.length,
      authDeleted: result.authAccountDeleted,
    });

    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────
// GET /gdpr/consents — list user's consent records
// ────────────────────────────────────────────────────────────

router.get(
  '/consents',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // Resolve patient ID
    const sb = createServiceClient();
    const { data: patient } = await sb.from('patients').select('id').eq('user_id', userId).single();

    if (!patient) {
      // User exists but has no patient record — return empty
      return res.json({ success: true, data: [] });
    }

    const consents = await getConsents(patient.id);
    res.json({ success: true, data: consents });
  })
);

// ────────────────────────────────────────────────────────────
// PUT /gdpr/consents — grant or revoke a consent
// ────────────────────────────────────────────────────────────

router.put(
  '/consents',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { consentType, granted } = req.body;

    if (!consentType || typeof granted !== 'boolean') {
      throw new AppError(
        'consentType (string) and granted (boolean) are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    const validTypes = ['treatment', 'data_sharing', 'marketing', 'research'];
    if (!validTypes.includes(consentType)) {
      throw new AppError(
        `consentType must be one of: ${validTypes.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Resolve patient ID
    const sb = createServiceClient();
    const { data: patient } = await sb.from('patients').select('id').eq('user_id', userId).single();

    if (!patient) {
      throw new AppError('No patient record found for this user', 404, 'NOT_FOUND');
    }

    const ipAddress = req.ip ?? req.socket.remoteAddress;
    const consent = await updateConsent(patient.id, consentType, granted, ipAddress);

    if (!consent) {
      throw AppError.internal('Failed to update consent');
    }

    // Compliance log
    await sb.from('compliance_logs').insert({
      user_id: userId,
      action: granted ? 'consent_granted' : 'consent_revoked',
      details: { consentType, ip: ipAddress },
    });

    logger.info('Consent updated', { userId, consentType, granted });
    res.json({ success: true, data: consent });
  })
);

export default router;
