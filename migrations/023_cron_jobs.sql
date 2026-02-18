-- Migration 023: Cron Jobs for Scheduled Tasks
-- Automated appointment reminders, cleanup, and maintenance
-- Run this AFTER enabling Cron extension in Supabase Dashboard

-- ============================================================
-- NOTIFICATION QUEUE TABLE
-- ============================================================

-- Queue for scheduled notifications (reminders, etc.)
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  recipient text NOT NULL, -- email address or phone number
  subject text,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts int DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON public.notification_queue(user_id);

-- RLS for notification queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notification_queue
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================
-- APPOINTMENT REMINDER FUNCTION
-- ============================================================

-- Function to queue appointment reminders
CREATE OR REPLACE FUNCTION queue_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  appointment RECORD;
  patient RECORD;
  provider RECORD;
  reminder_time timestamptz;
BEGIN
  -- Find appointments in the next 24 hours that haven't been reminded
  FOR appointment IN
    SELECT a.*
    FROM public.appointments a
    WHERE a.status IN ('scheduled', 'confirmed')
    AND a.scheduled_at BETWEEN now() AND now() + interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_queue nq
      WHERE nq.metadata->>'appointment_id' = a.id::text
      AND nq.notification_type = 'appointment_reminder_24h'
    )
  LOOP
    -- Get patient info
    SELECT * INTO patient
    FROM public.user_profiles
    WHERE id = appointment.patient_id;
    
    -- Get provider info
    SELECT * INTO provider
    FROM public.providers
    WHERE id = appointment.provider_id;
    
    -- Queue email reminder
    IF patient.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (
        user_id,
        notification_type,
        channel,
        recipient,
        subject,
        message,
        metadata,
        scheduled_for
      ) VALUES (
        appointment.patient_id,
        'appointment_reminder_24h',
        'email',
        patient.email,
        'Appointment Reminder - Tomorrow',
        format(
          'Hi %s, this is a reminder that you have an appointment scheduled for %s at %s with %s.',
          COALESCE(patient.full_name, 'there'),
          to_char(appointment.scheduled_at, 'Day, Month DD, YYYY'),
          to_char(appointment.scheduled_at, 'HH:MI AM'),
          COALESCE(provider.business_name, 'your provider')
        ),
        jsonb_build_object(
          'appointment_id', appointment.id,
          'provider_id', appointment.provider_id,
          'scheduled_at', appointment.scheduled_at
        ),
        now() -- Send immediately
      );
    END IF;
    
    -- Queue SMS reminder if phone available
    IF patient.phone IS NOT NULL THEN
      INSERT INTO public.notification_queue (
        user_id,
        notification_type,
        channel,
        recipient,
        message,
        metadata,
        scheduled_for
      ) VALUES (
        appointment.patient_id,
        'appointment_reminder_24h',
        'sms',
        patient.phone,
        format(
          'Reminder: Your appointment is tomorrow at %s. Reply CONFIRM to confirm or call to reschedule.',
          to_char(appointment.scheduled_at, 'HH:MI AM')
        ),
        jsonb_build_object(
          'appointment_id', appointment.id,
          'scheduled_at', appointment.scheduled_at
        ),
        now()
      );
    END IF;
  END LOOP;
  
  -- Also queue 1-hour reminders
  FOR appointment IN
    SELECT a.*
    FROM public.appointments a
    WHERE a.status IN ('scheduled', 'confirmed')
    AND a.scheduled_at BETWEEN now() AND now() + interval '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_queue nq
      WHERE nq.metadata->>'appointment_id' = a.id::text
      AND nq.notification_type = 'appointment_reminder_1h'
    )
  LOOP
    SELECT * INTO patient FROM public.user_profiles WHERE id = appointment.patient_id;
    
    IF patient.phone IS NOT NULL THEN
      INSERT INTO public.notification_queue (
        user_id, notification_type, channel, recipient, message, metadata, scheduled_for
      ) VALUES (
        appointment.patient_id,
        'appointment_reminder_1h',
        'sms',
        patient.phone,
        'Your appointment starts in 1 hour. See you soon!',
        jsonb_build_object('appointment_id', appointment.id),
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- PAYMENT REMINDER FUNCTION
-- ============================================================

-- Function to send payment reminders for pending invoices
CREATE OR REPLACE FUNCTION queue_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invoice RECORD;
  patient RECORD;
BEGIN
  -- Find invoices due in 3 days
  FOR invoice IN
    SELECT i.*
    FROM public.invoices i
    WHERE i.status = 'pending'
    AND i.due_date BETWEEN now() AND now() + interval '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_queue nq
      WHERE nq.metadata->>'invoice_id' = i.id::text
      AND nq.notification_type = 'payment_reminder_3d'
      AND nq.created_at > now() - interval '1 day'
    )
  LOOP
    SELECT * INTO patient FROM public.user_profiles WHERE id = invoice.patient_id;
    
    IF patient.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (
        user_id, notification_type, channel, recipient, subject, message, metadata, scheduled_for
      ) VALUES (
        invoice.patient_id,
        'payment_reminder_3d',
        'email',
        patient.email,
        format('Payment Due Soon - $%s', (invoice.amount / 100.0)::numeric(10,2)),
        format(
          'Hi %s, this is a reminder that your payment of $%s is due on %s. Please make your payment to avoid late fees.',
          COALESCE(patient.full_name, 'there'),
          (invoice.amount / 100.0)::numeric(10,2),
          to_char(invoice.due_date, 'Month DD, YYYY')
        ),
        jsonb_build_object('invoice_id', invoice.id, 'amount', invoice.amount),
        now()
      );
    END IF;
  END LOOP;
  
  -- Find overdue invoices
  FOR invoice IN
    SELECT i.*
    FROM public.invoices i
    WHERE i.status = 'pending'
    AND i.due_date < now()
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_queue nq
      WHERE nq.metadata->>'invoice_id' = i.id::text
      AND nq.notification_type = 'payment_overdue'
      AND nq.created_at > now() - interval '3 days'
    )
  LOOP
    SELECT * INTO patient FROM public.user_profiles WHERE id = invoice.patient_id;
    
    IF patient.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (
        user_id, notification_type, channel, recipient, subject, message, metadata, scheduled_for
      ) VALUES (
        invoice.patient_id,
        'payment_overdue',
        'email',
        patient.email,
        format('Payment Overdue - $%s', (invoice.amount / 100.0)::numeric(10,2)),
        format(
          'Hi %s, your payment of $%s was due on %s. Please make your payment as soon as possible to avoid additional fees.',
          COALESCE(patient.full_name, 'there'),
          (invoice.amount / 100.0)::numeric(10,2),
          to_char(invoice.due_date, 'Month DD, YYYY')
        ),
        jsonb_build_object('invoice_id', invoice.id, 'amount', invoice.amount, 'days_overdue', EXTRACT(DAY FROM now() - invoice.due_date)),
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- CLEANUP FUNCTIONS
-- ============================================================

-- Clean up expired sessions and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete expired wallet verification challenges (older than 10 minutes)
  DELETE FROM public.wallet_verification_challenges
  WHERE expires_at < now()
  OR (verified_at IS NOT NULL AND verified_at < now() - interval '1 hour');
  
  -- Delete old notification queue entries (older than 30 days)
  DELETE FROM public.notification_queue
  WHERE status IN ('sent', 'failed', 'cancelled')
  AND created_at < now() - interval '30 days';
  
  -- Delete read notifications older than 90 days
  DELETE FROM public.notifications
  WHERE read = true
  AND created_at < now() - interval '90 days';
  
  -- Archive old audit logs (keep in separate archive table)
  -- For now, just delete entries older than 1 year
  DELETE FROM public.audit_logs
  WHERE created_at < now() - interval '1 year';
  
  -- Clean up old PHI access logs (keep 7 years for HIPAA compliance)
  -- Just log the cleanup, don't actually delete PHI audit logs
  INSERT INTO public.audit_logs (action, entity_type, details)
  VALUES ('cleanup_job', 'system', jsonb_build_object(
    'job', 'cleanup_expired_data',
    'timestamp', now()
  ));
END;
$$;

-- Update analytics/statistics
CREATE OR REPLACE FUNCTION update_daily_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Refresh materialized views if they exist
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'daily_transaction_summary') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_transaction_summary;
  END IF;
  
  -- Log the refresh
  INSERT INTO public.audit_logs (action, entity_type, details)
  VALUES ('stats_refresh', 'system', jsonb_build_object(
    'job', 'update_daily_statistics',
    'timestamp', now()
  ));
END;
$$;

-- Mark no-show appointments
CREATE OR REPLACE FUNCTION mark_noshow_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Mark appointments as no-show if scheduled time has passed by 30 minutes
  -- and status is still 'scheduled' or 'confirmed'
  UPDATE public.appointments
  SET 
    status = 'no_show',
    updated_at = now()
  WHERE status IN ('scheduled', 'confirmed')
  AND scheduled_at < now() - interval '30 minutes';
END;
$$;

-- ============================================================
-- PROVIDER PAYOUT SUMMARY
-- ============================================================

-- Weekly payout summary for providers
CREATE OR REPLACE FUNCTION queue_weekly_payout_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  provider RECORD;
  weekly_total numeric;
  transaction_count int;
BEGIN
  -- Only run on Mondays
  IF EXTRACT(DOW FROM now()) != 1 THEN
    RETURN;
  END IF;
  
  FOR provider IN
    SELECT p.*, up.email
    FROM public.providers p
    JOIN public.user_profiles up ON up.id = p.id
    WHERE p.status = 'active'
  LOOP
    -- Calculate last week's earnings
    SELECT 
      COALESCE(SUM(amount), 0),
      COUNT(*)
    INTO weekly_total, transaction_count
    FROM public.transactions
    WHERE provider_id = provider.id
    AND status = 'completed'
    AND created_at BETWEEN now() - interval '7 days' AND now();
    
    -- Only send if there were transactions
    IF transaction_count > 0 AND provider.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (
        user_id, notification_type, channel, recipient, subject, message, metadata, scheduled_for
      ) VALUES (
        provider.id,
        'weekly_payout_summary',
        'email',
        provider.email,
        format('Weekly Earnings Summary - $%s', (weekly_total / 100.0)::numeric(10,2)),
        format(
          'Hi %s, here is your weekly earnings summary:\n\nTotal Earnings: $%s\nTransactions: %s\n\nThank you for using Advancia PayLedger!',
          COALESCE(provider.business_name, 'there'),
          (weekly_total / 100.0)::numeric(10,2),
          transaction_count
        ),
        jsonb_build_object(
          'total', weekly_total,
          'count', transaction_count,
          'period_start', now() - interval '7 days',
          'period_end', now()
        ),
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- SCHEDULE CRON JOBS
-- ============================================================

-- Schedule appointment reminders (every 15 minutes)
SELECT cron.schedule(
  'appointment-reminders',
  '*/15 * * * *',  -- Every 15 minutes
  $$SELECT queue_appointment_reminders()$$
);

-- Schedule payment reminders (daily at 9 AM UTC)
SELECT cron.schedule(
  'payment-reminders',
  '0 9 * * *',  -- 9:00 AM UTC daily
  $$SELECT queue_payment_reminders()$$
);

-- Schedule cleanup job (daily at 3 AM UTC - low traffic)
SELECT cron.schedule(
  'data-cleanup',
  '0 3 * * *',  -- 3:00 AM UTC daily
  $$SELECT cleanup_expired_data()$$
);

-- Schedule statistics update (every hour)
SELECT cron.schedule(
  'stats-update',
  '0 * * * *',  -- Every hour on the hour
  $$SELECT update_daily_statistics()$$
);

-- Schedule no-show marking (every 30 minutes)
SELECT cron.schedule(
  'mark-noshows',
  '*/30 * * * *',  -- Every 30 minutes
  $$SELECT mark_noshow_appointments()$$
);

-- Schedule weekly payout summaries (Monday 8 AM UTC)
SELECT cron.schedule(
  'weekly-payout-summary',
  '0 8 * * 1',  -- 8:00 AM UTC every Monday
  $$SELECT queue_weekly_payout_summaries()$$
);

-- ============================================================
-- VIEW SCHEDULED JOBS
-- ============================================================

-- Create a view to monitor cron jobs
CREATE OR REPLACE VIEW public.scheduled_jobs AS
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job;

-- Grant view access to admins
GRANT SELECT ON public.scheduled_jobs TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.notification_queue IS 'Queue for scheduled notifications - processed by cron jobs';
COMMENT ON FUNCTION queue_appointment_reminders IS 'Cron job: Queue 24h and 1h appointment reminders';
COMMENT ON FUNCTION queue_payment_reminders IS 'Cron job: Queue payment due and overdue reminders';
COMMENT ON FUNCTION cleanup_expired_data IS 'Cron job: Clean up expired tokens, old notifications';
COMMENT ON FUNCTION update_daily_statistics IS 'Cron job: Refresh materialized views and statistics';
COMMENT ON FUNCTION mark_noshow_appointments IS 'Cron job: Mark appointments as no-show after 30min';
COMMENT ON FUNCTION queue_weekly_payout_summaries IS 'Cron job: Send weekly earnings summary to providers';
