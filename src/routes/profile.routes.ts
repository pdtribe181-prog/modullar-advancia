import { Router, Request, Response } from 'express';
import { authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import * as apiServices from '../services/api.service.js';

const router = Router();

// GET /profile — fetch authenticated user's profile
router.get(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const profile = await apiServices.userProfilesService.getById(user!.id);
    res.json({ success: true, data: profile });
  })
);

// PATCH /profile — update authenticated user's profile
router.patch(
  '/',
  authenticateWithProfile,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    // Whitelist allowed fields to prevent mass assignment (e.g., role escalation)
    const { full_name, phone, avatar_url, date_of_birth, address } = req.body;
    const allowedUpdates = Object.fromEntries(
      Object.entries({ full_name, phone, avatar_url, date_of_birth, address }).filter(
        ([, v]) => v !== undefined
      )
    );
    const profile = await apiServices.userProfilesService.update(user!.id, allowedUpdates);
    res.json({ success: true, data: profile });
  })
);

export default router;
