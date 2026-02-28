/**
 * MedBed Routes & Controller Tests (via supertest)
 * Covers: GET /, POST /bookings, GET /bookings, POST /bookings/:id/cancel
 */
import { jest } from '@jest/globals';

// Mock auth
let mockAuthUser: any = { id: 'user-1', role: 'patient' };

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => {
    if (mockAuthUser) _req.user = mockAuthUser;
    next();
  },
  AuthenticatedRequest: {},
}));

// Mock MedBedService
const mockGetAllMedBeds = jest.fn<any>();
const mockCreateBooking = jest.fn<any>();
const mockGetUserBookings = jest.fn<any>();
const mockCancelBooking = jest.fn<any>();

jest.unstable_mockModule('../services/medbed.service.js', () => ({
  MedBedService: class {
    getAllMedBeds = mockGetAllMedBeds;
    createBooking = mockCreateBooking;
    getUserBookings = mockGetUserBookings;
    cancelBooking = mockCancelBooking;
  },
}));

jest.unstable_mockModule('../utils/errors.js', () => ({
  sendErrorResponse: jest.fn<any>((res: any, error: any) => {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }),
}));

const { default: medbedRouter } = await import('../routes/medbed.routes.js');

const expressModule = await import('express');
const express = expressModule.default;
const { default: request } = await import('supertest');

let app: any;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/medbeds', medbedRouter);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthUser = { id: 'user-1', role: 'patient' };
});

describe('MedBed Routes & Controller', () => {
  describe('GET /medbeds', () => {
    it('returns all medbeds', async () => {
      mockGetAllMedBeds.mockResolvedValue([{ id: 'mb1', name: 'Pod A' }]);
      const res = await request(app).get('/medbeds');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'mb1', name: 'Pod A' }]);
    });

    it('returns 500 on service error', async () => {
      mockGetAllMedBeds.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/medbeds');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /medbeds/bookings', () => {
    it('creates a booking', async () => {
      mockCreateBooking.mockResolvedValue({ id: 'b1', status: 'pending' });
      const res = await request(app).post('/medbeds/bookings').send({
        medBedId: 'mb1',
        startTime: '2025-02-01T10:00:00Z',
        endTime: '2025-02-01T12:00:00Z',
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'b1', status: 'pending' });
    });

    it('returns 400 when missing fields', async () => {
      const res = await request(app).post('/medbeds/bookings').send({});
      expect(res.status).toBe(400);
    });

    it('returns 401 when userId is missing', async () => {
      mockAuthUser = {};
      const res = await request(app).post('/medbeds/bookings').send({
        medBedId: 'mb1',
        startTime: '2025-02-01T10:00:00Z',
        endTime: '2025-02-01T12:00:00Z',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 500 on service error', async () => {
      mockCreateBooking.mockRejectedValue(new Error('Not available'));
      const res = await request(app).post('/medbeds/bookings').send({
        medBedId: 'mb1',
        startTime: '2025-02-01T10:00:00Z',
        endTime: '2025-02-01T12:00:00Z',
      });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /medbeds/bookings', () => {
    it('returns user bookings', async () => {
      mockGetUserBookings.mockResolvedValue([{ id: 'b1' }]);
      const res = await request(app).get('/medbeds/bookings');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'b1' }]);
    });

    it('returns 401 when userId is missing', async () => {
      mockAuthUser = {};
      const res = await request(app).get('/medbeds/bookings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 500 on service error', async () => {
      mockGetUserBookings.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/medbeds/bookings');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /medbeds/bookings/:id/cancel', () => {
    it('cancels a booking', async () => {
      mockCancelBooking.mockResolvedValue({ id: 'b1', status: 'cancelled' });
      const res = await request(app).post('/medbeds/bookings/b1/cancel');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'b1', status: 'cancelled' });
    });

    it('returns 401 when userId is missing', async () => {
      mockAuthUser = {};
      const res = await request(app).post('/medbeds/bookings/b1/cancel');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 500 when service throws', async () => {
      mockCancelBooking.mockRejectedValue(new Error('Not found'));
      const res = await request(app).post('/medbeds/bookings/b999/cancel');
      expect(res.status).toBe(500);
    });
  });
});
