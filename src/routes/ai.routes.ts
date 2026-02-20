/**
 * AI Routes — Healthcare AI Endpoints
 * Ported from muchaeljohn739337-art/advanciapayledger-new1
 * Original: Cloudflare Workers AI
 * Adapted: Express routes for modullar-advancia
 *
 * Endpoints:
 *   POST /ai/chat              — General AI assistance
 *   POST /ai/medical-coding    — CPT/ICD-10 code lookup
 *   POST /ai/fraud-detection   — Transaction risk analysis
 *   POST /ai/patient-support   — Billing inquiries
 *   POST /ai/compliance-check  — HIPAA compliance review
 *   GET  /ai/services          — List available AI endpoints
 */

import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service.js';
import { asyncHandler } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';

const router = Router();

// ── GET /ai/services — List all AI endpoints ──
router.get('/services', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Advancia PayLedger AI Services',
    endpoints: [
      {
        path: '/ai/chat',
        method: 'POST',
        description: 'General AI assistance for healthcare payments',
      },
      {
        path: '/ai/medical-coding',
        method: 'POST',
        description: 'CPT/ICD-10 medical billing code lookup',
      },
      { path: '/ai/fraud-detection', method: 'POST', description: 'Payment fraud risk analysis' },
      {
        path: '/ai/patient-support',
        method: 'POST',
        description: 'Patient billing inquiries & help',
      },
      { path: '/ai/compliance-check', method: 'POST', description: 'HIPAA compliance assessment' },
    ],
    version: '1.0.0',
    contributor: 'muchaeljohn739337-art',
  });
});

// ── POST /ai/chat — General AI Chat ──
router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message',
      });
    }

    logger.info('AI chat request', { messageLength: message.length, context });
    const result = await aiService.chat({ message, context });
    res.json(result);
  })
);

// ── POST /ai/medical-coding — Medical Billing Codes ──
router.post(
  '/medical-coding',
  asyncHandler(async (req: Request, res: Response) => {
    const { procedure, diagnosis } = req.body;

    if (!procedure && !diagnosis) {
      return res.status(400).json({
        success: false,
        error: 'Provide at least one of: procedure, diagnosis',
      });
    }

    logger.info('AI medical coding request', { procedure, diagnosis });
    const result = await aiService.medicalCoding({
      procedure: procedure || 'routine checkup',
      diagnosis: diagnosis || 'general examination',
    });
    res.json(result);
  })
);

// ── POST /ai/fraud-detection — Fraud Risk Analysis ──
router.post(
  '/fraud-detection',
  asyncHandler(async (req: Request, res: Response) => {
    const { transaction } = req.body;

    if (!transaction || typeof transaction !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: transaction (object)',
      });
    }

    logger.info('AI fraud detection request', { transactionId: transaction.id });
    const result = await aiService.fraudDetection({ transaction });
    res.json(result);
  })
);

// ── POST /ai/patient-support — Patient Support ──
router.post(
  '/patient-support',
  asyncHandler(async (req: Request, res: Response) => {
    const { query, patientId } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: query',
      });
    }

    logger.info('AI patient support request', { queryLength: query.length });
    const result = await aiService.patientSupport({ query, patientId });
    res.json(result);
  })
);

// ── POST /ai/compliance-check — HIPAA Compliance ──
router.post(
  '/compliance-check',
  asyncHandler(async (req: Request, res: Response) => {
    const { process: processName, data } = req.body;

    if (!processName || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: process, data',
      });
    }

    logger.info('AI compliance check request', { process: processName, dataType: data });
    const result = await aiService.complianceCheck({ process: processName, data });
    res.json(result);
  })
);

export default router;
