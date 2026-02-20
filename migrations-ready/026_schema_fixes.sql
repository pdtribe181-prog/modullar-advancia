-- Migration 026: Database Schema Fixes
-- Fixes missing columns, triggers, functions, and enum values
-- Based on audit of code vs. schema

BEGIN;

-- ============================================================
-- 1. ADD MISSING COLUMNS TO PROVIDERS
-- ============================================================

ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive'));

-- Update existing providers to have a business name based on user profile
UPDATE public.providers p
SET business_name = COALESCE(p.business_name, up.full_name || ' Medical Practice')
FROM public.user_profiles up
WHERE p.user_id = up.id AND p.business_name IS NULL;

-- ============================================================
-- 2. ADD MISSING ENUM VALUE: 'confirmed' TO appointment_status
-- ============================================================

-- Check if 'confirmed' already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'confirmed' 
    AND enumtypid = 'appointment_status'::regtype
  ) THEN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. ADD payment_status COLUMN TO appointments
-- ============================================================

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (
  payment_status IN ('pending', 'paid', 'partially_paid', 'refunded', 'failed')
);

-- ============================================================
-- 4. CREATE MISSING RPC FUNCTION: get_revenue_by_day
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_revenue_by_day(days_back integer DEFAULT 30)
RETURNS TABLE (
  date date,
  total_revenue numeric,
  transaction_count bigint,
  successful_count bigint,
  avg_transaction numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(t.created_at) as date,
    COALESCE(SUM(t.amount), 0)::numeric as total_revenue,
    COUNT(*)::bigint as transaction_count,
    COUNT(*) FILTER (WHERE t.payment_status::text = 'completed')::bigint as successful_count,
    COALESCE(AVG(t.amount), 0)::numeric as avg_transaction
  FROM public.transactions t
  WHERE t.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY DATE(t.created_at)
  ORDER BY date DESC;
END;
$$;

-- Grant execute to authenticated users (admin check in route)
GRANT EXECUTE ON FUNCTION public.get_revenue_by_day(integer) TO authenticated;

-- ============================================================
-- 5. ADD updated_at TRIGGERS TO CORE TABLES
-- ============================================================

-- Ensure function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers to core tables (drop first if exists to be idempotent)
DO $$
DECLARE
  tables_needing_trigger text[] := ARRAY[
    'user_profiles', 'providers', 'patients', 'appointments',
    'transactions', 'invoices', 'disputes', 'api_keys'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables_needing_trigger
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER update_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW
       EXECUTE FUNCTION public.update_updated_at_timestamp()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 6. CREATE DAILY TRANSACTION SUMMARY MATERIALIZED VIEW
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS public.daily_transaction_summary;

CREATE MATERIALIZED VIEW public.daily_transaction_summary AS
SELECT 
  DATE(t.created_at) as transaction_date,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE t.payment_status::text = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE t.payment_status::text = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE t.payment_status::text = 'pending') as pending_count,
  COALESCE(SUM(t.amount) FILTER (WHERE t.payment_status::text = 'completed'), 0) as total_revenue,
  COALESCE(AVG(t.amount) FILTER (WHERE t.payment_status::text = 'completed'), 0) as avg_transaction_amount,
  COUNT(DISTINCT t.patient_id) as unique_patients,
  COUNT(DISTINCT t.provider_id) as unique_providers
FROM public.transactions t
WHERE t.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(t.created_at)
ORDER BY transaction_date DESC
WITH DATA;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_txn_summary_date 
ON public.daily_transaction_summary(transaction_date);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_daily_transaction_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_transaction_summary;
EXCEPTION
  WHEN OTHERS THEN
    -- Non-concurrent refresh if concurrent fails
    REFRESH MATERIALIZED VIEW public.daily_transaction_summary;
END;
$$;

-- ============================================================
-- 7. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================

-- Appointment lookups by status and date
CREATE INDEX IF NOT EXISTS idx_appointments_status_date 
ON public.appointments(status, appointment_date);

-- Invoice lookups by status and due date
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date 
ON public.invoices(status, due_date);

-- Provider lookups by status
CREATE INDEX IF NOT EXISTS idx_providers_status 
ON public.providers(status);

-- Transaction lookups by date for revenue reports
CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
ON public.transactions(created_at);

-- ============================================================
-- 8. ENABLE REALTIME FOR KEY TABLES
-- ============================================================

-- Note: This may need to be run separately if publication doesn't exist yet
DO $$
BEGIN
  -- Create publication if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- Add tables to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

-- ============================================================
-- 9. FIX CRON JOB FUNCTIONS (appointment reminders)
-- ============================================================

CREATE OR REPLACE FUNCTION public.queue_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Find appointments in next 24 hours that haven't been reminded
  FOR r IN
    SELECT 
      a.id,
      a.patient_id,
      a.provider_id,
      a.appointment_date,
      a.appointment_time,
      up.full_name as patient_name,
      up.email as patient_email,
      prov_profile.full_name as provider_name,
      COALESCE(p.business_name, prov_profile.full_name || ' Practice') as practice_name
    FROM public.appointments a
    JOIN public.patients pat ON a.patient_id = pat.id
    JOIN public.user_profiles up ON pat.user_id = up.id
    JOIN public.providers p ON a.provider_id = p.id
    JOIN public.user_profiles prov_profile ON p.user_id = prov_profile.id
    WHERE a.status::text IN ('scheduled', 'confirmed')
      AND a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = pat.user_id
          AND n.notification_type::text = 'system'
          AND n.metadata->>'appointment_id' = a.id::text
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    -- Insert reminder notification
    INSERT INTO public.notifications (
      user_id,
      notification_type,
      title,
      message,
      metadata,
      read_status
    ) VALUES (
      (SELECT user_id FROM public.patients WHERE id = r.patient_id),
      'system',
      'Appointment Reminder',
      format('Your appointment with %s is tomorrow at %s', r.provider_name, r.appointment_time),
      jsonb_build_object(
        'appointment_id', r.id,
        'provider_name', r.provider_name,
        'appointment_date', r.appointment_date,
        'appointment_time', r.appointment_time
      ),
      'unread'
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 10. FIX: Mark no-show appointments function
-- ============================================================

-- Drop existing function if it has different signature
DROP FUNCTION IF EXISTS public.mark_noshow_appointments();

CREATE OR REPLACE FUNCTION public.mark_noshow_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.appointments
  SET status = 'no_show'::appointment_status, updated_at = NOW()
  WHERE status::text IN ('scheduled', 'confirmed')
    AND (appointment_date < CURRENT_DATE 
         OR (appointment_date = CURRENT_DATE 
             AND appointment_time < CURRENT_TIME - INTERVAL '1 hour'))
  RETURNING 1 INTO updated_count;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================================
-- 11. ADD HELPER FUNCTION: Get scheduled timestamp from date+time
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_appointment_timestamp(
  p_appointment_date date,
  p_appointment_time time
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_appointment_date + p_appointment_time)::timestamptz;
$$;

COMMIT;