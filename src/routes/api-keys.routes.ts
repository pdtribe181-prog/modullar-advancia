import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateParams, uuidSchema } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: uuidSchema });

// GET /api-keys — list user's API keys
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const apiKeys = await apiServices.apiKeysService.getByUser(user!.id);
    res.json({ success: true, data: apiKeys });
  })
);

// POST /api-keys — create an API key
router.post(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const { name, description, environment, permissions, expires_at } = req.body;
    const allowedFields = Object.fromEntries(
      Object.entries({
        name,
        description,
        environment,
        permissions,
        expires_at,
        user_id: user!.id,
      }).filter(([, v]) => v !== undefined)
    );
    const apiKey = await apiServices.apiKeysService.create(allowedFields);
    res.status(201).json({ success: true, data: apiKey });
  })
);

// DELETE /api-keys/:id — revoke an API key
router.delete(
  '/:id',
  authenticateWithProfile,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    await apiServices.apiKeysService.revoke(String(req.params.id));
    res.status(204).send();
  })
);

export default router;
