import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateParams, uuidSchema } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: uuidSchema });

// GET /providers — list all providers
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = await apiServices.providersService.getAll();
    res.json({ success: true, data: providers });
  })
);

// GET /providers/specialty/:specialty — filter by specialty
router.get(
  '/specialty/:specialty',
  authenticateWithProfile,
  validateParams(z.object({ specialty: z.string().min(1).max(100) })),
  asyncHandler(async (req: Request, res: Response) => {
    const providers = await apiServices.providersService.getBySpecialty(
      String(req.params.specialty)
    );
    res.json({ success: true, data: providers });
  })
);

// GET /providers/:id — get provider by id
router.get(
  '/:id',
  authenticateWithProfile,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await apiServices.providersService.getById(String(req.params.id));
    res.json({ success: true, data: provider });
  })
);

export default router;
