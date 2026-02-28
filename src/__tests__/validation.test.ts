import { jest } from '@jest/globals';
import {
  emailSchema,
  passwordSchema,
  uuidSchema,
  amountSchema,
  phoneSchema,
  signupSchema,
  signinSchema,
  createPaymentIntentSchema,
  refundSchema,
  paginationSchema,
  validateQuery,
} from '../middleware/validation.middleware.js';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('rejects email longer than 255 chars', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts valid password with letter and number', () => {
      const result = passwordSchema.safeParse('Password123');
      expect(result.success).toBe(true);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('at least 8 characters');
    });

    it('rejects password without letters', () => {
      const result = passwordSchema.safeParse('12345678');
      expect(result.success).toBe(false);
    });

    it('rejects password without numbers', () => {
      const result = passwordSchema.safeParse('PasswordOnly');
      expect(result.success).toBe(false);
    });

    it('rejects password longer than 128 chars', () => {
      const longPassword = 'a'.repeat(127) + '1' + 'a';
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('amountSchema', () => {
    it('accepts positive integer', () => {
      const result = amountSchema.safeParse(1000);
      expect(result.success).toBe(true);
    });

    it('rejects negative number', () => {
      const result = amountSchema.safeParse(-100);
      expect(result.success).toBe(false);
    });

    it('rejects zero', () => {
      const result = amountSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('rejects decimal numbers', () => {
      const result = amountSchema.safeParse(10.5);
      expect(result.success).toBe(false);
    });

    it('rejects amounts exceeding max limit', () => {
      const result = amountSchema.safeParse(100000000);
      expect(result.success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('accepts valid phone number', () => {
      const result = phoneSchema.safeParse('+14155551234');
      expect(result.success).toBe(true);
    });

    it('accepts phone without plus sign', () => {
      const result = phoneSchema.safeParse('14155551234');
      expect(result.success).toBe(true);
    });

    it('accepts undefined (optional)', () => {
      const result = phoneSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('rejects phone starting with plus and 0', () => {
      // Regex ^\+?[1-9]\d{1,14}$ requires first digit after + to be 1-9
      const result = phoneSchema.safeParse('+0123456789');
      expect(result.success).toBe(false);
    });

    it('rejects phone starting with 0', () => {
      const result = phoneSchema.safeParse('+014155551234');
      expect(result.success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('accepts valid signup data', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        fullName: 'John Doe',
        role: 'patient',
      });
      expect(result.success).toBe(true);
    });

    it('uses default role when not provided', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
      expect(result.data?.role).toBe('patient');
    });

    it('accepts provider role', () => {
      const result = signupSchema.safeParse({
        email: 'provider@example.com',
        password: 'Password123',
        role: 'provider',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        role: 'superadmin',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing email', () => {
      const result = signupSchema.safeParse({
        password: 'Password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('signinSchema', () => {
    it('accepts valid signin data', () => {
      const result = signinSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = signinSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createPaymentIntentSchema', () => {
    it('accepts valid payment intent data', () => {
      const result = createPaymentIntentSchema.safeParse({
        amount: 5000,
        currency: 'usd',
      });
      expect(result.success).toBe(true);
    });

    it('uses default currency', () => {
      const result = createPaymentIntentSchema.safeParse({
        amount: 1000,
      });
      expect(result.success).toBe(true);
      expect(result.data?.currency).toBe('usd');
    });

    it('accepts patientId and appointmentId', () => {
      const result = createPaymentIntentSchema.safeParse({
        amount: 5000,
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        appointmentId: '123e4567-e89b-12d3-a456-426614174001',
      });
      expect(result.success).toBe(true);
    });

    it('accepts metadata', () => {
      const result = createPaymentIntentSchema.safeParse({
        amount: 5000,
        metadata: { order_id: '123', source: 'web' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid currency length', () => {
      const result = createPaymentIntentSchema.safeParse({
        amount: 1000,
        currency: 'dollars',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refundSchema', () => {
    it('accepts full refund', () => {
      const result = refundSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
      });
      expect(result.success).toBe(true);
    });

    it('accepts partial refund', () => {
      const result = refundSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
        amount: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('accepts refund with reason', () => {
      const result = refundSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
        reason: 'duplicate',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid paymentIntentId format', () => {
      const result = refundSchema.safeParse({
        paymentIntentId: 'invalid_id',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid reason', () => {
      const result = refundSchema.safeParse({
        paymentIntentId: 'pi_1234567890',
        reason: 'changed_mind',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('accepts defaults when empty', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(20);
      expect(result.data?.sortOrder).toBe('desc');
    });

    it('accepts custom pagination', () => {
      const result = paginationSchema.safeParse({
        page: 5,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'asc',
      });
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(5);
      expect(result.data?.limit).toBe(50);
    });

    it('coerces string numbers', () => {
      const result = paginationSchema.safeParse({
        page: '3',
        limit: '25',
      });
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(3);
      expect(result.data?.limit).toBe(25);
    });

    it('rejects page less than 1', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects limit greater than 100', () => {
      const result = paginationSchema.safeParse({
        limit: 200,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateQuery middleware', () => {
    it('returns 400 when query validation fails', () => {
      const middleware = validateQuery(paginationSchema);

      const req = { query: { page: '0', limit: '200' } } as any;
      const jsonMock = jest.fn<any>();
      const statusMock = jest.fn<any>().mockReturnValue({ json: jsonMock });
      const res = { status: statusMock } as any;
      const next = jest.fn<any>();

      middleware(req, res, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid query parameters' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('passes validated query to next when valid', () => {
      const middleware = validateQuery(paginationSchema);

      const req = { query: { page: '2', limit: '10' } } as any;
      const res = {} as any;
      const next = jest.fn<any>();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(2);
      expect(req.query.limit).toBe(10);
    });
  });
});
