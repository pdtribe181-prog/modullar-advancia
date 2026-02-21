import { Request, Response } from 'express';
import { MedBedService } from '../services/medbed.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const medBedService = new MedBedService();

export class MedBedController {
  /**
   * Get all available MedBeds
   */
  getAllMedBeds = async (req: Request, res: Response) => {
    try {
      const medBeds = await medBedService.getAllMedBeds();
      res.json(medBeds);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Create a booking
   */
  createBooking = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { medBedId, startTime, endTime } = req.body;

      if (!medBedId || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const booking = await medBedService.createBooking(userId, medBedId, startTime, endTime);
      res.status(201).json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Get user bookings
   */
  getUserBookings = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const bookings = await medBedService.getUserBookings(userId);
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Cancel booking
   */
  cancelBooking = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const id = String(req.params.id);

      const booking = await medBedService.cancelBooking(id, userId);
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
