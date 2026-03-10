import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateParams, uuidSchema } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: uuidSchema });

// GET /webhooks — list user's webhooks
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const webhooks = await apiServices.webhooksService.getByUser(user!.id);
    res.json({ success: true, data: webhooks });
  })
);

// POST /webhooks — create a webhook
router.post(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const { name, url, description, subscribed_events, headers, timeout_seconds } = req.body;
    const allowedFields = Object.fromEntries(
      Object.entries({
        name,
        url,
        description,
        subscribed_events,
        headers,
        timeout_seconds,
        user_id: user!.id,
      }).filter(([, v]) => v !== undefined)
    );
    const webhook = await apiServices.webhooksService.create(allowedFields);
    res.status(201).json({ success: true, data: webhook });
  })
);

// DELETE /webhooks/:id — delete a webhook
router.delete(
  '/:id',
  authenticateWithProfile,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    await apiServices.webhooksService.delete(String(req.params.id));
    res.status(204).send();
  })
);

export default router;
