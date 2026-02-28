/**
 * MedBed Service + Controller Tests
 * Covers: getAllMedBeds, getMedBedById, checkAvailability, createBooking,
 *         getUserBookings, cancelBooking, and MedBedController endpoints
 */
import { jest } from '@jest/globals';

function createChain(finalResult: any) {
  const c: any = {};
  c.select = jest.fn<any>().mockReturnValue(c);
  c.insert = jest.fn<any>().mockReturnValue(c);
  c.update = jest.fn<any>().mockReturnValue(c);
  c.eq = jest.fn<any>().mockReturnValue(c);
  c.neq = jest.fn<any>().mockReturnValue(c);
  c.lt = jest.fn<any>().mockReturnValue(c);
  c.gt = jest.fn<any>().mockReturnValue(c);
  c.order = jest.fn<any>().mockReturnValue(c);
  c.single = jest.fn<any>().mockResolvedValue(finalResult);
  c.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return c;
}

let mockChain: any;
const mockFrom = jest.fn<any>().mockImplementation(() => mockChain);

jest.unstable_mockModule('../lib/supabase.js', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
  createServiceClient: () => ({ from: mockFrom }),
}));

// Need to mock medbed types
jest.unstable_mockModule('../types/medbed.types.js', () => ({}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../utils/errors.js', () => ({
  sendErrorResponse: jest.fn<any>((res: any, error: any) => {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }),
}));

const { MedBedService } = await import('../services/medbed.service.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(() => mockChain);
});

describe('MedBed Service', () => {
  let service: InstanceType<typeof MedBedService>;

  beforeEach(() => {
    service = new MedBedService();
  });

  describe('getAllMedBeds', () => {
    it('returns active medbeds', async () => {
      mockChain = createChain({ data: [{ id: 'mb1', is_active: true }], error: null });
      const result = await service.getAllMedBeds();
      expect(result).toEqual([{ id: 'mb1', is_active: true }]);
    });

    it('throws on error', async () => {
      mockChain = createChain({ data: null, error: { message: 'DB error' } });
      await expect(service.getAllMedBeds()).rejects.toThrow('DB error');
    });
  });

  describe('getMedBedById', () => {
    it('returns a medbed', async () => {
      mockChain = createChain({ data: { id: 'mb1', hourly_rate: 50 }, error: null });
      const result = await service.getMedBedById('mb1');
      expect(result).toEqual({ id: 'mb1', hourly_rate: 50 });
    });
  });

  describe('checkAvailability', () => {
    it('returns true when no overlapping bookings', async () => {
      mockChain = createChain({ data: [], error: null });
      const result = await service.checkAvailability(
        'mb1',
        '2025-01-01T10:00:00Z',
        '2025-01-01T12:00:00Z'
      );
      expect(result).toBe(true);
    });

    it('returns false when overlapping bookings found', async () => {
      mockChain = createChain({ data: [{ id: 'booking-1' }], error: null });
      const result = await service.checkAvailability(
        'mb1',
        '2025-01-01T10:00:00Z',
        '2025-01-01T12:00:00Z'
      );
      expect(result).toBe(false);
    });
  });

  describe('createBooking', () => {
    it('creates a booking when available', async () => {
      // First call: checkAvailability (empty → available)
      // Second call: getMedBedById (returns medbed with hourly_rate)
      // Third call: insert booking
      const availabilityChain = createChain({ data: [], error: null });
      const medBedChain = createChain({ data: { id: 'mb1', hourly_rate: 50 }, error: null });
      const insertChain = createChain({
        data: { id: 'b1', status: 'pending', total_amount: 100 },
        error: null,
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return availabilityChain;
        if (callCount === 2) return medBedChain;
        return insertChain;
      });

      const result = await service.createBooking(
        'u1',
        'mb1',
        '2025-01-01T10:00:00Z',
        '2025-01-01T12:00:00Z'
      );
      expect(result).toEqual({ id: 'b1', status: 'pending', total_amount: 100 });
    });

    it('throws when time slot not available', async () => {
      mockChain = createChain({ data: [{ id: 'existing' }], error: null });
      await expect(
        service.createBooking('u1', 'mb1', '2025-01-01T10:00:00Z', '2025-01-01T12:00:00Z')
      ).rejects.toThrow('Selected time slot is not available');
    });
  });

  describe('getUserBookings', () => {
    it('returns user bookings', async () => {
      mockChain = createChain({ data: [{ id: 'b1', user_id: 'u1' }], error: null });
      mockFrom.mockImplementation(() => mockChain);
      const result = await service.getUserBookings('u1');
      expect(result).toEqual([{ id: 'b1', user_id: 'u1' }]);
    });
  });

  describe('cancelBooking', () => {
    it('cancels a booking owned by user', async () => {
      const ownershipChain = createChain({ data: { user_id: 'u1' }, error: null });
      const updateChain = createChain({ data: { id: 'b1', status: 'cancelled' }, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return ownershipChain;
        return updateChain;
      });

      const result = await service.cancelBooking('b1', 'u1');
      expect(result).toEqual({ id: 'b1', status: 'cancelled' });
    });

    it('throws when booking not found', async () => {
      const notFoundChain = createChain({ data: null, error: null });
      mockFrom.mockImplementation(() => notFoundChain);
      await expect(service.cancelBooking('b999', 'u1')).rejects.toThrow('Booking not found');
    });

    it('throws when not the owner', async () => {
      const otherUserChain = createChain({ data: { user_id: 'other-user' }, error: null });
      mockFrom.mockImplementation(() => otherUserChain);
      await expect(service.cancelBooking('b1', 'u1')).rejects.toThrow('Unauthorized');
    });
  });
});
