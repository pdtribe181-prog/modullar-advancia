import { Router, Response } from 'express';
import {
  authenticate,
  authenticateWithProfile,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { stripeServices } from '../services/stripe.service.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';
import {
  sendAppointmentConfirmedEmail,
  sendAppointmentCancelledEmail,
} from '../services/email.service.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  uuidSchema,
  createAppointmentSchema,
  paginationSchema,
} from '../middleware/validation.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { z } from 'zod';

const router = Router();
const supabase = createServiceClient();

// Additional validation schemas for appointment routes
const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

const providerIdParamsSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID'),
});

const idParamsSchema = z.object({
  id: z.string().uuid('Invalid appointment ID'),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

const rescheduleAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

const bookAppointmentSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  reason: z.string().max(500).optional(),
  duration: z.number().int().min(15).max(120).default(30),
});

const updateAppointmentSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  reason: z.string().max(500).optional(),
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional(),
});

const providersQuerySchema = z.object({
  specialty: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================
// APPOINTMENT BOOKING ROUTES
// ============================================================

/**
 * Get available time slots for a provider
 */
router.get(
  '/providers/:providerId/availability',
  validateParams(providerIdParamsSchema),
  validateQuery(availabilityQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { providerId } = req.params;
    const { date } = req.query as { date: string };

    // Get provider's availability settings
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, business_name, specialty, consultation_fee, availability_settings')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      throw AppError.notFound('Provider not found');
    }

    // Get existing appointments for the date
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time, duration_minutes')
      .eq('provider_id', providerId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed']);

    // Generate available time slots (9 AM - 5 PM, 30 min slots)
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    const slotDuration = 30;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isBooked = existingAppointments?.some((apt) => apt.appointment_time === time);

        if (!isBooked) {
          slots.push({
            time,
            available: true,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        provider: {
          id: provider.id,
          name: provider.business_name,
          specialty: provider.specialty,
          consultationFee: provider.consultation_fee,
        },
        date,
        slots,
      },
    });
  })
);

/**
 * List providers with optional filters
 */
router.get(
  '/providers',
  validateQuery(providersQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { specialty, limit, offset } = req.query as unknown as {
      specialty?: string;
      limit: number;
      offset: number;
    };

    let query = supabase
      .from('providers')
      .select(
        'id, business_name, specialty, consultation_fee, stripe_account_id, stripe_onboarding_complete'
      )
      .eq('stripe_onboarding_complete', true)
      .range(offset, offset + limit - 1);

    if (specialty) {
      query = query.eq('specialty', specialty);
    }

    const { data: providers, error } = await query;

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data: {
        providers: providers.map((p) => ({
          id: p.id,
          name: p.business_name,
          specialty: p.specialty,
          consultationFee: p.consultation_fee,
          acceptsPayments: !!p.stripe_account_id,
        })),
        total: providers.length,
      },
    });
  })
);

/**
 * Book an appointment
 */
router.post(
  '/book',
  authenticate,
  validateBody(bookAppointmentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { providerId, date, time, reason, duration } = req.body;

    // Get patient profile
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (patientError || !patient) {
      // Create patient record if doesn't exist
      const { data: newPatient, error: createError } = await supabase
        .from('patients')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) {
        throw AppError.internal('Failed to create patient profile');
      }
    }

    const patientId = patient?.id;

    // Get provider details
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, business_name, specialty, consultation_fee, stripe_account_id')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      throw AppError.notFound('Provider not found');
    }

    // Check if slot is available
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('provider_id', providerId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['scheduled', 'confirmed'])
      .single();

    if (existingAppointment) {
      throw AppError.conflict('Time slot is no longer available');
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        appointment_date: date,
        appointment_time: time,
        duration_minutes: duration,
        reason,
        status: 'scheduled',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (appointmentError) throw appointmentError;

    // Create payment intent for the appointment
    const paymentIntent = await stripeServices.paymentIntents.create({
      amount: Math.round(provider.consultation_fee * 100),
      currency: 'usd',
      patientId: patientId,
      providerId: providerId,
      appointmentId: appointment.id,
      description: `Consultation with ${provider.business_name}`,
      metadata: {
        appointment_id: appointment.id,
        patient_id: patientId,
        provider_id: providerId,
      },
    });

    // Update appointment with payment intent
    await supabase
      .from('appointments')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', appointment.id);

    // Send confirmation email
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (userProfile?.email) {
      await sendAppointmentConfirmedEmail(userProfile.email, {
        patientName: userProfile.full_name,
        providerName: provider.business_name,
        specialty: (provider as any).specialty,
        date: new Date(appointment.appointment_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: appointment.appointment_time,
        duration: appointment.duration_minutes,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          duration: appointment.duration_minutes,
          provider: {
            id: provider.id,
            name: provider.business_name,
          },
          status: appointment.status,
        },
        payment: {
          clientSecret: paymentIntent.client_secret,
          amount: provider.consultation_fee,
          currency: 'USD',
        },
      },
    });
  })
);

/**
 * Get user's appointments
 */
router.get(
  '/my-appointments',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { status, upcoming } = req.query;

    // Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      res.json({ success: true, data: { appointments: [] } });
      return;
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
      provider:providers(id, business_name, specialty)
    `
      )
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (upcoming === 'true') {
      query = query.gte('appointment_date', new Date().toISOString().split('T')[0]);
    }

    const { data: appointments, error } = await query;

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data: {
        appointments: appointments.map((apt) => ({
          id: apt.id,
          date: apt.appointment_date,
          time: apt.appointment_time,
          duration: apt.duration_minutes,
          reason: apt.reason,
          status: apt.status,
          paymentStatus: apt.payment_status,
          provider: apt.provider,
        })),
      },
    });
  })
);

/**
 * Get single appointment details
 */
router.get(
  '/:id',
  authenticate,
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };

    // Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(
        `
      *,
      provider:providers(id, business_name, specialty, phone, email),
      patient:patients(id, user_id)
    `
      )
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      throw AppError.notFound('Appointment not found');
    }

    // Verify ownership
    if (appointment.patient_id !== patient?.id) {
      throw AppError.forbidden('Access denied');
    }

    res.json({ success: true, data: { appointment } });
  })
);

/**
 * Cancel an appointment
 */
router.post(
  '/:id/cancel',
  authenticate,
  validateParams(idParamsSchema),
  validateBody(cancelAppointmentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };
    const { reason } = req.body;

    // Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Get appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, stripe_payment_intent_id, provider:providers(id, business_name)')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      throw AppError.notFound('Appointment not found');
    }

    // Verify ownership
    if (appointment.patient_id !== patient?.id) {
      throw AppError.forbidden('Access denied');
    }

    // Can only cancel scheduled/confirmed appointments
    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      throw AppError.badRequest('Cannot cancel this appointment');
    }

    // If payment was made, process refund
    let refunded = false;
    if (appointment.payment_status === 'paid' && appointment.stripe_payment_intent_id) {
      try {
        await stripeServices.refunds.createFull(
          appointment.stripe_payment_intent_id,
          'requested_by_customer'
        );
        refunded = true;
      } catch (refundError: unknown) {
        logger.warn('Refund failed during appointment cancellation', {
          appointmentId,
          error: refundError instanceof Error ? refundError.message : 'Unknown error',
        });
      }
    }

    // Update appointment status
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send cancellation email
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (userProfile?.email) {
      const providerData = Array.isArray(appointment.provider)
        ? appointment.provider[0]
        : appointment.provider;
      await sendAppointmentCancelledEmail(userProfile.email, {
        patientName: userProfile.full_name,
        providerName: providerData?.business_name || 'Provider',
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        reason,
        refunded,
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Appointment cancelled successfully',
        appointment: updatedAppointment,
      },
    });
  })
);

/**
 * Reschedule an appointment
 */
router.post(
  '/:id/reschedule',
  authenticate,
  validateParams(idParamsSchema),
  validateBody(rescheduleAppointmentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { id: appointmentId } = res.locals.validatedParams as { id: string };
    const { date, time } = req.body;

    // Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Get appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      throw AppError.notFound('Appointment not found');
    }

    // Verify ownership
    if (appointment.patient_id !== patient?.id) {
      throw AppError.forbidden('Access denied');
    }

    // Check if new slot is available
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('provider_id', appointment.provider_id)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['scheduled', 'confirmed'])
      .neq('id', appointmentId)
      .single();

    if (existingAppointment) {
      throw AppError.conflict('Time slot is not available');
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        appointment_date: date,
        appointment_time: time,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: {
        message: 'Appointment rescheduled successfully',
        appointment: updatedAppointment,
      },
    });
  })
);

export default router;
