import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validateParams, uuidSchema } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: uuidSchema });

// GET /notifications — list unread notifications for the authenticated user
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const notifications = await apiServices.notificationsService.getUnread(user!.id);
    res.json({ success: true, data: notifications });
  })
);

// PATCH /notifications/:id/read — mark a notification as read
router.patch(
  '/:id/read',
  authenticateWithProfile,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await apiServices.notificationsService.markAsRead(String(req.params.id));
    res.json({ success: true, data: notification });
  })
);

export default router;
