import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateParams, uuidSchema } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: uuidSchema });

// GET /patients — list patients (admin sees all, others see own record)
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, userProfile } = req as AuthenticatedRequest;
    const userRole = userProfile?.role;
    if (userRole === 'admin') {
      const patients = await apiServices.patientsService.getAll();
      return res.json({ success: true, data: patients });
    }
    const patient = await apiServices.patientsService.getById(user!.id);
    res.json({ success: true, data: patient ? [patient] : [] });
  })
);

// GET /patients/:id — get a single patient
router.get(
  '/:id',
  authenticateWithProfile,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { user, userProfile } = req as AuthenticatedRequest;
    const patientId = String(req.params.id);
    const userRole = userProfile?.role;
    if (userRole !== 'admin' && userRole !== 'provider' && user!.id !== patientId) {
      return res
        .status(403)
        .json({ success: false, error: 'Forbidden: cannot access other patient records' });
    }
    const patient = await apiServices.patientsService.getById(patientId);
    res.json({ success: true, data: patient });
  })
);

export default router;
