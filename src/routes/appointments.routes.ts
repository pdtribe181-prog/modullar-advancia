import { Router, Response } from 'express';
import { authenticate, authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { stripeServices } from '../services/stripe.service.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';
import { sendAppointmentConfirmedEmail, sendAppointmentCancelledEmail } from '../services/email.service.js';

const router = Router();
const supabase = createServiceClient();

// ============================================================
// APPOINTMENT BOOKING ROUTES
// ============================================================

/**
 * Get available time slots for a provider
 */
router.get('/providers/:providerId/availability', async (req, res: Response) => {
  try {
    const { providerId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    // Get provider's availability settings
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, business_name, specialty, consultation_fee, availability_settings')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
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
        const isBooked = existingAppointments?.some(apt => apt.appointment_time === time);
        
        if (!isBooked) {
          slots.push({
            time,
            available: true,
          });
        }
      }
    }

    res.json({
      provider: {
        id: provider.id,
        name: provider.business_name,
        specialty: provider.specialty,
        consultationFee: provider.consultation_fee,
      },
      date,
      slots,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List providers with optional filters
 */
router.get('/providers', async (req, res: Response) => {
  try {
    const { specialty, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('providers')
      .select('id, business_name, specialty, consultation_fee, stripe_account_id, stripe_onboarding_complete')
      .eq('stripe_onboarding_complete', true)
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (specialty) {
      query = query.eq('specialty', specialty);
    }

    const { data: providers, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      providers: providers.map(p => ({
        id: p.id,
        name: p.business_name,
        specialty: p.specialty,
        consultationFee: p.consultation_fee,
        acceptsPayments: !!p.stripe_account_id,
      })),
      total: providers.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Book an appointment
 */
router.post('/book', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { providerId, date, time, reason, duration = 30 } = req.body;

    if (!providerId || !date || !time) {
      return res.status(400).json({ error: 'Provider, date, and time are required' });
    }

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
        return res.status(500).json({ error: 'Failed to create patient profile' });
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
      return res.status(404).json({ error: 'Provider not found' });
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
      return res.status(409).json({ error: 'Time slot is no longer available' });
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

    if (appointmentError) {
      return res.status(500).json({ error: appointmentError.message });
    }

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
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's appointments
 */
router.get('/my-appointments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, upcoming } = req.query;

    // Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      return res.json({ appointments: [] });
    }

    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        duration_minutes,
        reason,
        status,
        payment_status,
        provider:providers(id, business_name, specialty)
      `)
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (upcoming === 'true') {
      query = query.gte('appointment_date', new Date().toISOString().split('T')[0]);
    }

    const { data: appointments, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      appointments: appointments.map(apt => ({
        id: apt.id,
        date: apt.appointment_date,
        time: apt.appointment_time,
        duration: apt.duration_minutes,
        reason: apt.reason,
        status: apt.status,
        paymentStatus: apt.payment_status,
        provider: apt.provider,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single appointment details
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;

    // Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        provider:providers(id, business_name, specialty, phone, email),
        patient:patients(id, user_id)
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Verify ownership
    if (appointment.patient_id !== patient?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ appointment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel an appointment
 */
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;
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
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Verify ownership
    if (appointment.patient_id !== patient?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only cancel scheduled/confirmed appointments
    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot cancel this appointment' });
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
      } catch (refundError: any) {
        console.error('Refund failed:', refundError.message);
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

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Send cancellation email
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (userProfile?.email) {
      const providerData = Array.isArray(appointment.provider) ? appointment.provider[0] : appointment.provider;
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
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reschedule an appointment
 */
router.post('/:id/reschedule', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ error: 'New date and time are required' });
    }

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
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Verify ownership
    if (appointment.patient_id !== patient?.id) {
      return res.status(403).json({ error: 'Access denied' });
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
      return res.status(409).json({ error: 'Time slot is not available' });
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

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
