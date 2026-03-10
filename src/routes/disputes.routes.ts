import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateParams, uuidSchema } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: uuidSchema });

// GET /disputes — list all disputes
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (_req: Request, res: Response) => {
    const disputes = await apiServices.disputesService.getAll();
    res.json({ success: true, data: disputes });
  })
);

// GET /disputes/:id — get a single dispute
router.get(
  '/:id',
  authenticateWithProfile,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await apiServices.disputesService.getById(String(req.params.id));
    res.json({ success: true, data: dispute });
  })
);

// POST /disputes — create a dispute
router.post(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      transaction_id,
      invoice_id,
      patient_id,
      provider_id,
      dispute_reason,
      amount,
      currency,
      due_date,
      customer_description,
    } = req.body;
    const allowedFields = Object.fromEntries(
      Object.entries({
        transaction_id,
        invoice_id,
        patient_id,
        provider_id,
        dispute_reason,
        amount,
        currency,
        due_date,
        customer_description,
      }).filter(([, v]) => v !== undefined)
    );
    const dispute = await apiServices.disputesService.create(allowedFields);
    res.status(201).json({ success: true, data: dispute });
  })
);

export default router;
