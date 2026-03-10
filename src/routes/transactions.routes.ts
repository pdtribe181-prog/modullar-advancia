import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { apiLimiter, paymentLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { createServiceClient } from '../lib/supabase.js';
import * as apiServices from '../services/api.service.js';

const router = Router();

// GET /transactions — list the authenticated user's transactions
router.get(
  '/',
  authenticateWithProfile,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, userProfile } = req as AuthenticatedRequest;
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
    const userRole = userProfile?.role;

    let transactions;
    if (userRole === 'admin') {
      // Admins can see all transactions
      const { data, error } = await (
        createServiceClient() as ReturnType<typeof createServiceClient>
      )
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw AppError.internal('Failed to fetch transactions');
      transactions = data;
    } else if (userRole === 'provider') {
      transactions = await apiServices.transactionsService.getByProvider(user!.id);
    } else {
      transactions = await apiServices.transactionsService.getByPatient(user!.id);
    }

    res.json({ success: true, data: transactions?.slice(0, limit) ?? [] });
  })
);

// POST /transactions/by-patient
router.post(
  '/by-patient',
  authenticateWithProfile,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, userProfile } = req as AuthenticatedRequest;
    const userRole = userProfile?.role;
    const patientId =
      userRole === 'admin' || userRole === 'provider' ? String(req.body.patientId) : user!.id;
    const transactions = await apiServices.transactionsService.getByPatient(patientId);
    res.json({ success: true, data: transactions });
  })
);

// POST /transactions/by-provider
router.post(
  '/by-provider',
  authenticateWithProfile,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, userProfile } = req as AuthenticatedRequest;
    const userRole = userProfile?.role;
    const providerId = userRole === 'admin' ? String(req.body.providerId) : user!.id;
    const transactions = await apiServices.transactionsService.getByProvider(providerId);
    res.json({ success: true, data: transactions });
  })
);

// POST /transactions — create
router.post(
  '/',
  authenticateWithProfile,
  paymentLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Whitelist allowed fields to prevent mass assignment
    const {
      patient_id,
      provider_id,
      appointment_id,
      amount,
      currency,
      payment_method,
      description,
      billing_name,
      billing_email,
      billing_address,
    } = req.body;
    const allowedFields = Object.fromEntries(
      Object.entries({
        patient_id,
        provider_id,
        appointment_id,
        amount,
        currency,
        payment_method,
        description,
        billing_name,
        billing_email,
        billing_address,
      }).filter(([, v]) => v !== undefined)
    );
    const transaction = await apiServices.transactionsService.create(allowedFields);
    res.status(201).json({ success: true, data: transaction });
  })
);

export default router;
