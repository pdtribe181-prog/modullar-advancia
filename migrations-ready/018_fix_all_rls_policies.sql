-- Migration 018: Fix ALL RLS Policies for Tables Missing Policies
-- Run this in Supabase SQL Editor to fix all 68+ tables

-- ============================================================
-- 1. CREATE HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. AUTO-CREATE ADMIN POLICIES FOR ALL TABLES MISSING POLICIES
-- ============================================================
DO $$
DECLARE
  tbl RECORD;
  policy_name TEXT;
BEGIN
  FOR tbl IN 
    SELECT t.tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
    WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.tablename = t.tablename AND p.schemaname = 'public'
      )
  LOOP
    policy_name := 'admin_full_access_' || tbl.tablename;
    
    -- Drop if exists (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl.tablename);
    
    -- Create admin-only policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      policy_name, tbl.tablename
    );
    
    RAISE NOTICE 'Created policy for table: %', tbl.tablename;
  END LOOP;
END $$;

-- ============================================================
-- 3. SPECIFIC POLICIES FOR USER-FACING TABLES
-- ============================================================

-- USER_PROFILES: Users can see and update their own profile
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
CREATE POLICY "users_view_own_profile" ON public.user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- PATIENTS: Patients see own data, providers see their patients
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;
DROP POLICY IF EXISTS "providers_view_their_patients" ON public.patients;
CREATE POLICY "patients_view_own" ON public.patients
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "providers_view_their_patients" ON public.patients
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.providers p ON p.id = a.provider_id
      WHERE a.patient_id = patients.id AND p.user_id = auth.uid()
    )
  );

-- PROVIDERS: Anyone can view providers, owners can update
DROP POLICY IF EXISTS "anyone_view_providers" ON public.providers;
DROP POLICY IF EXISTS "providers_update_own" ON public.providers;
CREATE POLICY "anyone_view_providers" ON public.providers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "providers_update_own" ON public.providers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- APPOINTMENTS: Patients/providers see their own appointments
DROP POLICY IF EXISTS "users_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "users_manage_own_appointments" ON public.appointments;
CREATE POLICY "users_view_own_appointments" ON public.appointments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = appointments.patient_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.providers WHERE id = appointments.provider_id AND user_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "users_manage_own_appointments" ON public.appointments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = appointments.patient_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.providers WHERE id = appointments.provider_id AND user_id = auth.uid())
  );

-- TRANSACTIONS: Users see their own transactions
DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions;
CREATE POLICY "users_view_own_transactions" ON public.transactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = transactions.patient_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.providers WHERE id = transactions.provider_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- INVOICES: Users see their own invoices
DROP POLICY IF EXISTS "users_view_own_invoices" ON public.invoices;
CREATE POLICY "users_view_own_invoices" ON public.invoices
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = invoices.patient_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.providers WHERE id = invoices.provider_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- INVOICE_ITEMS: Via invoice access
DROP POLICY IF EXISTS "users_view_invoice_items" ON public.invoice_items;
CREATE POLICY "users_view_invoice_items" ON public.invoice_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      LEFT JOIN public.patients p ON p.id = i.patient_id
      LEFT JOIN public.providers pr ON pr.id = i.provider_id
      WHERE i.id = invoice_items.invoice_id
      AND (p.user_id = auth.uid() OR pr.user_id = auth.uid())
    )
    OR public.is_admin()
  );

-- DISPUTES: Parties can see their disputes
DROP POLICY IF EXISTS "users_view_own_disputes" ON public.disputes;
CREATE POLICY "users_view_own_disputes" ON public.disputes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      LEFT JOIN public.patients p ON p.id = t.patient_id
      LEFT JOIN public.providers pr ON pr.id = t.provider_id
      WHERE t.id = disputes.transaction_id
      AND (p.user_id = auth.uid() OR pr.user_id = auth.uid())
    )
    OR public.is_admin()
  );

-- NOTIFICATIONS: Users see their own notifications
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- API_KEYS: Users manage their own API keys
DROP POLICY IF EXISTS "users_manage_own_api_keys" ON public.api_keys;
CREATE POLICY "users_manage_own_api_keys" ON public.api_keys
  FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- WEBHOOKS: Users manage their own webhooks
DROP POLICY IF EXISTS "users_manage_own_webhooks" ON public.webhooks;
CREATE POLICY "users_manage_own_webhooks" ON public.webhooks
  FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- MEDICAL_RECORDS: Patients see own, providers see their patients
DROP POLICY IF EXISTS "patients_view_own_records" ON public.medical_records;
DROP POLICY IF EXISTS "providers_view_patient_records" ON public.medical_records;
CREATE POLICY "patients_view_own_records" ON public.medical_records
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = medical_records.patient_id AND user_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "providers_view_patient_records" ON public.medical_records
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.providers p ON p.id = a.provider_id
      WHERE a.patient_id = medical_records.patient_id AND p.user_id = auth.uid()
    )
  );

-- PAYMENT_METHODS: Users manage own payment methods
DROP POLICY IF EXISTS "users_manage_own_payment_methods" ON public.payment_methods;
CREATE POLICY "users_manage_own_payment_methods" ON public.payment_methods
  FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- REFUNDS: Users view their own refunds
DROP POLICY IF EXISTS "users_view_own_refunds" ON public.refunds;
CREATE POLICY "users_view_own_refunds" ON public.refunds
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      LEFT JOIN public.patients p ON p.id = t.patient_id
      LEFT JOIN public.providers pr ON pr.id = t.provider_id
      WHERE t.id = refunds.transaction_id
      AND (p.user_id = auth.uid() OR pr.user_id = auth.uid())
    )
    OR public.is_admin()
  );

-- ============================================================
-- 4. ENSURE RLS IS ENABLED ON ALL PUBLIC TABLES
-- ============================================================
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Done!
SELECT 'All RLS policies created successfully!' as status;