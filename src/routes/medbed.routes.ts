import { Router, Request, Response } from 'express';
import { MedBedController } from '../controllers/medbed.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
const controller = new MedBedController();

// Create wrapper for async handlers
const asyncHandler =
  (fn: (req: Request, res: Response, next: any) => Promise<any>) =>
  (req: Request, res: Response, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Public routes
router.get(
  '/',
  asyncHandler((req: Request, res: Response) => controller.getAllMedBeds(req, res))
);

// Protected routes
router.post(
  '/bookings',
  authenticate,
  asyncHandler((req: Request, res: Response) => controller.createBooking(req, res))
);
router.get(
  '/bookings',
  authenticate,
  asyncHandler((req: Request, res: Response) => controller.getUserBookings(req, res))
);
router.post(
  '/bookings/:id/cancel',
  authenticate,
  asyncHandler((req: Request, res: Response) => controller.cancelBooking(req, res))
);

export default router;
