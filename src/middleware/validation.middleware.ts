import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Common validation schemas for the healthcare payment platform
 */

// Email validation
export const emailSchema = z.string().email('Invalid email address').max(255);

// Password validation (min 8 chars, at least 1 number, 1 letter)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID format');

// Amount validation (in cents, positive integer)
export const amountSchema = z
  .number()
  .int('Amount must be a whole number')
  .positive('Amount must be positive')
  .max(99999999, 'Amount exceeds maximum limit');

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

// Date validation
export const dateSchema = z.string().datetime().or(z.date());

// --- Auth Schemas ---
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(['patient', 'provider', 'admin']).default('patient'),
});

export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// --- Payment Schemas ---
export const createPaymentIntentSchema = z.object({
  amount: amountSchema,
  currency: z.string().length(3).default('usd'),
  patientId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const refundSchema = z.object({
  paymentIntentId: z.string().startsWith('pi_'),
  amount: amountSchema.optional(), // Partial refund
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

// --- Appointment Schemas ---
export const createAppointmentSchema = z.object({
  providerId: uuidSchema,
  patientId: uuidSchema.optional(),
  scheduledAt: dateSchema,
  duration: z.number().int().min(15).max(480).default(30), // minutes
  type: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  amount: amountSchema.optional(),
});

// --- Pagination Schema ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Middleware factory for request body validation
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory for query params validation
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Invalid query parameters', details: errors });
    }

    // Express 5 makes req.query a getter-only property, so use defineProperty
    Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
    res.locals.validatedQuery = result.data;
    next();
  };
}

/**
 * Middleware factory for URL params validation
 */
export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Invalid URL parameters', details: errors });
    }

    // Express 5 makes req.params a getter-only property, so use defineProperty
    Object.defineProperty(req, 'params', {
      value: result.data,
      writable: true,
      configurable: true,
    });
    res.locals.validatedParams = result.data;
    next();
  };
}

// Export type helpers
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
