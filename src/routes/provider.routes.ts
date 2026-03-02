import { Router, Response } from 'express';
import Stripe from 'stripe';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { stripeServices } from '../services/stripe.service.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validation.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { cacheResponse, invalidateResource } from '../middleware/cache.middleware.js';
import { z } from 'zod';

const router = Router();
const supabase = createServiceClient();

// Type for appointment with patient relation
interface AppointmentWithPatient {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  payment_status: string;
  patient: { id: string; user_id: string } | { id: string; user_id: string }[] | null;
}

// Validation schemas for provider routes
const updateProviderSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  specialty: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  email: z.string().email().optional(),
  consultationFee: z.number().positive().max(9999).optional(),
  bio: z.string().max(1000).optional(),
});

const appointmentsQuerySchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  upcoming: z.string().optional(),
});

const earningsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).default(30),
});

const scheduleQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
});

const idParamsSchema = z.object({
  id: z.string().uuid('Invalid appointment ID'),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

const completeAppointmentSchema = z.object({
  notes: z.string().max(2000).optional(),
});

// ============================================================
// PROVIDER LIST (Admin / Public)
// ============================================================

/**
 * List providers
 * GET /provider
 * Admins see all providers; authenticated patients see active providers only.
 */
router.get(
  '/',
  authenticate,
  cacheResponse(30), // 30-second TTL — provider list is read-heavy
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    // Determine caller's role
    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = callerProfile?.role === 'admin';

    // Parse query params
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const offset = (page - 1) * limit;
    const specialty = req.query.specialty as string | undefined;
    const search = req.query.search as string | undefined;

    let query = supabase
      .from('providers')
      .select(
        'id, user_id, business_name, specialty, phone, email, consultation_fee, bio, status, stripe_onboarding_complete, created_at',
        { count: 'exact' }
      );

    // Non-admins only see active/verified providers
    if (!isAdmin) {
      query = query.eq('status', 'active');
    }

    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`);
    }

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,specialty.ilike.%${search}%`);
    }

    query = query.order('business_name', { ascending: true }).range(offset, offset + limit - 1);

    const { data: providers, error, count } = await query;

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data: {
        providers: providers || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  })
);

// ============================================================
// PROVIDER DASHBOARD ROUTES
// ============================================================

/**
 * Get provider profile for current user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    const { data: provider, error } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !provider) {
      throw AppError.notFound('Provider profile not found');
    }

    res.json({ success: true, data: { provider } });
  })
);

/**
 * Update provider profile
 */
router.put(
  '/me',
  authenticate,
  validateBody(updateProviderSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { businessName, specialty, phone, email, consultationFee, bio } = req.body;

    const { data: provider, error } = await supabase
      .from('providers')
      .update({
        business_name: businessName,
        specialty,
        phone,
        email,
        consultation_fee: consultationFee,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw AppError.internal();

    res.json({ success: true, data: { provider } });
  })
);

/**
 * Get provider's appointments
 */
router.get(
  '/appointments',
  authenticate,
  validateQuery(appointmentsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { status, date, upcoming } = req.query as unknown as z.infer<
      typeof appointmentsQuerySchema
    >;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    let query = supabase
      .from('appointments')
      .select(
        `
      id,
      appointment_date,
      appointment_time,
      duration_minutes,
      reason,
      status,
      payment_status,
      patient:patients(id, user_id)
    `
      )
      .eq('provider_id', provider.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      query = query.eq('appointment_date', date);
    }

    if (upcoming === 'true') {
      query = query.gte('appointment_date', new Date().toISOString().split('T')[0]);
    }

    const { data: appointments, error } = await query;

    if (error) throw AppError.internal();

    // Enrich with patient info
    const enrichedAppointments = await Promise.all(
      (appointments as AppointmentWithPatient[]).map(async (apt) => {
        const patientData = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient;
        if (patientData?.user_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', patientData.user_id)
            .single();

          return {
            ...apt,
            patient: {
              ...patientData,
              name: profile?.full_name,
              email: profile?.email,
            },
          };
        }
        return apt;
      })
    );

    res.json({ success: true, data: { appointments: enrichedAppointments } });
  })
);

/**
 * Get single appointment details
 */
router.get(
  '/appointments/:id',
  authenticate,
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(
        `
      *,
      patient:patients(id, user_id)
    `
      )
      .eq('id', appointmentId)
      .eq('provider_id', provider.id)
      .single();

    if (error || !appointment) {
      throw AppError.notFound('Appointment not found');
    }

    // Get patient details
    if (appointment.patient?.user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email, phone')
        .eq('user_id', appointment.patient.user_id)
        .single();

      appointment.patient = {
        ...appointment.patient,
        name: profile?.full_name,
        email: profile?.email,
        phone: profile?.phone,
      };
    }

    res.json({ success: true, data: { appointment } });
  })
);

/**
 * Confirm an appointment
 */
router.post(
  '/appointments/:id/confirm',
  authenticate,
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('provider_id', provider.id)
      .eq('status', 'scheduled')
      .select()
      .single();

    if (error || !appointment) {
      throw AppError.notFound('Appointment not found or cannot be confirmed');
    }

    res.json({ success: true, data: { message: 'Appointment confirmed', appointment } });
  })
);

/**
 * Complete an appointment
 */
router.post(
  '/appointments/:id/complete',
  authenticate,
  validateParams(idParamsSchema),
  validateBody(completeAppointmentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };
    const { notes } = req.body;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        notes,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('provider_id', provider.id)
      .in('status', ['scheduled', 'confirmed'])
      .select()
      .single();

    if (error || !appointment) {
      throw AppError.notFound('Appointment not found or cannot be completed');
    }

    res.json({ success: true, data: { message: 'Appointment completed', appointment } });
  })
);

/**
 * Cancel an appointment (by provider)
 */
router.post(
  '/appointments/:id/cancel',
  authenticate,
  validateParams(idParamsSchema),
  validateBody(cancelAppointmentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };
    const { reason } = req.body;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    // Get appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, stripe_payment_intent_id')
      .eq('id', appointmentId)
      .eq('provider_id', provider.id)
      .single();

    if (fetchError || !appointment) {
      throw AppError.notFound('Appointment not found');
    }

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      throw AppError.badRequest('Cannot cancel this appointment');
    }

    // Process refund if payment was made
    if (appointment.payment_status === 'paid' && appointment.stripe_payment_intent_id) {
      try {
        await stripeServices.refunds.createFull(
          appointment.stripe_payment_intent_id,
          'requested_by_customer'
        );
      } catch (refundError: unknown) {
        logger.warn('Refund failed during appointment cancellation', {
          appointmentId,
          error: refundError instanceof Error ? refundError.message : 'Unknown error',
        });
      }
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_by: 'provider',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: { message: 'Appointment cancelled', appointment: updatedAppointment },
    });
  })
);

/**
 * Get provider's earnings summary
 */
router.get(
  '/earnings',
  authenticate,
  validateQuery(earningsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { period } = req.query as unknown as z.infer<typeof earningsQuerySchema>;

    // Get provider
    const { data: provider } = await supabase
      .from('providers')
      .select('id, stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    // Get completed appointments in period
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, appointment_date, payment_status')
      .eq('provider_id', provider.id)
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .gte('appointment_date', startDate.toISOString().split('T')[0])
      .lte('appointment_date', endDate.toISOString().split('T')[0]);

    // Get Stripe balance if connected
    let stripeBalance = null;
    if (provider.stripe_account_id) {
      try {
        stripeBalance = await stripeServices.connect.getBalance(provider.stripe_account_id);
      } catch (e) {
        logger.warn('Could not fetch Stripe balance', { accountId: provider.stripe_account_id });
      }
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('consultation_fee')
      .eq('id', provider.id)
      .single();

    const completedCount = appointments?.length || 0;
    const totalEarnings = completedCount * (providerData?.consultation_fee || 0);

    res.json({
      success: true,
      data: {
        period: Number(period),
        completedAppointments: completedCount,
        totalEarnings,
        stripeBalance: stripeBalance
          ? {
              available:
                stripeBalance.available.reduce(
                  (sum: number, b: Stripe.Balance.Available) => sum + b.amount,
                  0
                ) / 100,
              pending:
                stripeBalance.pending.reduce(
                  (sum: number, b: Stripe.Balance.Pending) => sum + b.amount,
                  0
                ) / 100,
              currency: stripeBalance.available[0]?.currency || 'usd',
            }
          : null,
      },
    });
  })
);

/**
 * Get provider's schedule for a date range
 */
router.get(
  '/schedule',
  authenticate,
  validateQuery(scheduleQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query as unknown as z.infer<typeof scheduleQuerySchema>;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
      id,
      appointment_date,
      appointment_time,
      duration_minutes,
      status,
      reason,
      patient:patients(id)
    `
      )
      .eq('provider_id', provider.id)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) throw AppError.internal();

    // Group by date
    const schedule: Record<string, any[]> = {};
    appointments.forEach((apt) => {
      if (!schedule[apt.appointment_date]) {
        schedule[apt.appointment_date] = [];
      }
      schedule[apt.appointment_date].push({
        id: apt.id,
        time: apt.appointment_time,
        duration: apt.duration_minutes,
        status: apt.status,
        reason: apt.reason,
      });
    });

    res.json({ success: true, data: { schedule } });
  })
);

export default router;
