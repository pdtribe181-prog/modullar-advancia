import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { stripeServices } from '../services/stripe.service.js';

const router = Router();
const supabase = createServiceClient();

// ============================================================
// PROVIDER DASHBOARD ROUTES
// ============================================================

/**
 * Get provider profile for current user
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: provider, error } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    res.json({ provider });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update provider profile
 */
router.put('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ provider });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get provider's appointments
 */
router.get('/appointments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, date, upcoming } = req.query;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
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
        patient:patients(id, user_id)
      `)
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Enrich with patient info
    const enrichedAppointments = await Promise.all(
      appointments.map(async (apt: any) => {
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

    res.json({ appointments: enrichedAppointments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single appointment details
 */
router.get('/appointments/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, user_id)
      `)
      .eq('id', appointmentId)
      .eq('provider_id', provider.id)
      .single();

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
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

    res.json({ appointment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm an appointment
 */
router.post('/appointments/:id/confirm', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
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
      return res.status(404).json({ error: 'Appointment not found or cannot be confirmed' });
    }

    res.json({ message: 'Appointment confirmed', appointment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complete an appointment
 */
router.post('/appointments/:id/complete', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;
    const { notes } = req.body;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
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
      return res.status(404).json({ error: 'Appointment not found or cannot be completed' });
    }

    res.json({ message: 'Appointment completed', appointment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel an appointment (by provider)
 */
router.post('/appointments/:id/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;
    const { reason } = req.body;

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    // Get appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, stripe_payment_intent_id')
      .eq('id', appointmentId)
      .eq('provider_id', provider.id)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot cancel this appointment' });
    }

    // Process refund if payment was made
    if (appointment.payment_status === 'paid' && appointment.stripe_payment_intent_id) {
      try {
        await stripeServices.refunds.createFull(
          appointment.stripe_payment_intent_id,
          'requested_by_customer'
        );
      } catch (refundError: any) {
        console.error('Refund failed:', refundError.message);
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

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ message: 'Appointment cancelled', appointment: updatedAppointment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get provider's earnings summary
 */
router.get('/earnings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { period = '30' } = req.query;

    // Get provider
    const { data: provider } = await supabase
      .from('providers')
      .select('id, stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
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
        console.error('Could not fetch Stripe balance');
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
      period: Number(period),
      completedAppointments: completedCount,
      totalEarnings,
      stripeBalance: stripeBalance ? {
        available: stripeBalance.available.reduce((sum: number, b: any) => sum + b.amount, 0) / 100,
        pending: stripeBalance.pending.reduce((sum: number, b: any) => sum + b.amount, 0) / 100,
        currency: stripeBalance.available[0]?.currency || 'usd',
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get provider's schedule for a date range
 */
router.get('/schedule', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get provider ID
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        duration_minutes,
        status,
        reason,
        patient:patients(id)
      `)
      .eq('provider_id', provider.id)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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

    res.json({ schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
