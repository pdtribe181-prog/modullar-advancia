-- ============================================================
-- Migration 031: Fix RLS Infinite Recursion
-- ============================================================
-- Same as migrations/031_fix_rls_recursion.sql
-- Ready to apply via Supabase migration runner
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: Create SECURITY DEFINER helper functions
-- These bypass RLS because they run as the function owner (postgres)
-- ============================================================

-- is_admin: Check if current user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- is_provider: Check if current user is a provider
CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- get_patient_id: Get the patient record ID for the current user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_patient_id()
RETURNS uuid AS $$
  SELECT id FROM public.patients WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- get_provider_id: Get the provider record ID for the current user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_provider_id()
RETURNS uuid AS $$
  SELECT id FROM public.providers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- is_patient_of_provider: Check if a given patient has an appointment with the current provider
-- This breaks the patients <-> appointments circular dependency
CREATE OR REPLACE FUNCTION public.is_patient_of_provider(p_patient_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = p_patient_id
      AND a.provider_id = (SELECT id FROM public.providers WHERE user_id = auth.uid() LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- is_provider_of_patient: Check if a given provider serves the current patient
CREATE OR REPLACE FUNCTION public.is_provider_of_patient(p_provider_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.provider_id = p_provider_id
      AND a.patient_id = (SELECT id FROM public.patients WHERE user_id = auth.uid() LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- patient_ids_for_provider: Get all patient IDs that the current provider treats
CREATE OR REPLACE FUNCTION public.patient_ids_for_provider()
RETURNS SETOF uuid AS $$
  SELECT DISTINCT a.patient_id
  FROM public.appointments a
  JOIN public.providers p ON p.id = a.provider_id
  WHERE p.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ============================================================
-- PART 2: Drop ALL problematic policies
-- ============================================================

-- ── user_profiles ───────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update user status" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_update_user_status" ON public.user_profiles;

-- ── patients ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;
DROP POLICY IF EXISTS "Patients can update own data" ON public.patients;
DROP POLICY IF EXISTS "Providers can view their patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can select patients" ON public.patients;
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;
DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
DROP POLICY IF EXISTS "providers_view_their_patients" ON public.patients;
DROP POLICY IF EXISTS "admin_full_access_patients" ON public.patients;

-- ── appointments ────────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "users_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "users_manage_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_full_access_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "providers_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_create_appointments" ON public.appointments;
DROP POLICY IF EXISTS "providers_update_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_manage_appointments" ON public.appointments;

-- ── transactions ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can select transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admin_full_access_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admin_manage_transactions" ON public.transactions;

-- ── invoices ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can select invoices" ON public.invoices;
DROP POLICY IF EXISTS "users_view_own_invoices" ON public.invoices;
DROP POLICY IF EXISTS "admin_full_access_invoices" ON public.invoices;
DROP POLICY IF EXISTS "providers_create_invoices" ON public.invoices;
DROP POLICY IF EXISTS "admin_manage_invoices" ON public.invoices;

-- ── disputes ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own disputes" ON public.disputes;
DROP POLICY IF EXISTS "Patients can create disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admins can manage all disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admins can select disputes" ON public.disputes;
DROP POLICY IF EXISTS "users_view_own_disputes" ON public.disputes;
DROP POLICY IF EXISTS "admin_full_access_disputes" ON public.disputes;
DROP POLICY IF EXISTS "users_insert_own_disputes" ON public.disputes;
DROP POLICY IF EXISTS "patients_create_disputes" ON public.disputes;
DROP POLICY IF EXISTS "admin_manage_disputes" ON public.disputes;

-- ── medical_records ─────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own records" ON public.medical_records;
DROP POLICY IF EXISTS "Providers can view their patient records" ON public.medical_records;
DROP POLICY IF EXISTS "Providers can create records" ON public.medical_records;
DROP POLICY IF EXISTS "patients_view_own_records" ON public.medical_records;
DROP POLICY IF EXISTS "providers_view_patient_records" ON public.medical_records;
DROP POLICY IF EXISTS "admin_full_access_medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "providers_create_records" ON public.medical_records;

-- ── hipaa_audit_log ─────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all HIPAA logs" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "admin_select_hipaa_audit_log" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "service_insert_hipaa_audit_log" ON public.hipaa_audit_log;

-- ── insurance_claims ────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Providers can manage insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Admins can view all insurance claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Providers can view related claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Staff can create claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Staff can update claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "admin_full_access_insurance_claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "patients_view_own_claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "providers_manage_claims" ON public.insurance_claims;

-- ── patient_consents ────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own consents" ON public.patient_consents;
DROP POLICY IF EXISTS "Patients can manage own consents" ON public.patient_consents;
DROP POLICY IF EXISTS "Providers can view patient consents" ON public.patient_consents;
DROP POLICY IF EXISTS "admin_full_access_patient_consents" ON public.patient_consents;
DROP POLICY IF EXISTS "patients_view_own_consents" ON public.patient_consents;
DROP POLICY IF EXISTS "patients_manage_own_consents" ON public.patient_consents;
DROP POLICY IF EXISTS "providers_view_patient_consents" ON public.patient_consents;

-- ── prescriptions ───────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Providers can manage prescriptions for their patients" ON public.prescriptions;
DROP POLICY IF EXISTS "admin_full_access_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "patients_view_own_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "providers_manage_prescriptions" ON public.prescriptions;

-- ── lab_results ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Patients can view own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Providers can manage lab results" ON public.lab_results;
DROP POLICY IF EXISTS "admin_full_access_lab_results" ON public.lab_results;
DROP POLICY IF EXISTS "patients_view_own_lab_results" ON public.lab_results;
DROP POLICY IF EXISTS "providers_manage_lab_results" ON public.lab_results;

-- ── appointment_waitlist ────────────────────────────────────
DROP POLICY IF EXISTS "Patients can manage own waitlist entries" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "Providers can view their waitlist" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "Providers can update waitlist status" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "admin_full_access_appointment_waitlist" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "patients_manage_own_waitlist" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "providers_view_waitlist" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "providers_update_waitlist" ON public.appointment_waitlist;


-- ============================================================
-- PART 3: Recreate all policies using SECURITY DEFINER helpers
-- No direct subqueries on user_profiles, patients, or appointments
-- ============================================================

-- ── user_profiles ───────────────────────────────────────────
CREATE POLICY "users_view_own_profile" ON public.user_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "admins_update_user_status" ON public.user_profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── patients ────────────────────────────────────────────────
CREATE POLICY "patients_view_own" ON public.patients
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "patients_update_own" ON public.patients
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "providers_view_their_patients" ON public.patients
  FOR SELECT USING (
    public.is_patient_of_provider(id)
    OR public.is_admin()
  );

-- ── appointments ────────────────────────────────────────────
CREATE POLICY "patients_view_own_appointments" ON public.appointments
  FOR SELECT USING (patient_id = public.get_patient_id() OR public.is_admin());

CREATE POLICY "providers_view_own_appointments" ON public.appointments
  FOR SELECT USING (provider_id = public.get_provider_id());

CREATE POLICY "patients_create_appointments" ON public.appointments
  FOR INSERT WITH CHECK (patient_id = public.get_patient_id());

CREATE POLICY "providers_update_appointments" ON public.appointments
  FOR UPDATE USING (provider_id = public.get_provider_id())
  WITH CHECK (provider_id = public.get_provider_id());

CREATE POLICY "admin_manage_appointments" ON public.appointments
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── transactions ────────────────────────────────────────────
CREATE POLICY "users_view_own_transactions" ON public.transactions
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "admin_manage_transactions" ON public.transactions
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── invoices ────────────────────────────────────────────────
CREATE POLICY "users_view_own_invoices" ON public.invoices
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "providers_create_invoices" ON public.invoices
  FOR INSERT WITH CHECK (provider_id = public.get_provider_id() OR public.is_admin());

CREATE POLICY "admin_manage_invoices" ON public.invoices
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── disputes ────────────────────────────────────────────────
CREATE POLICY "users_view_own_disputes" ON public.disputes
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "patients_create_disputes" ON public.disputes
  FOR INSERT WITH CHECK (patient_id = public.get_patient_id());

CREATE POLICY "admin_manage_disputes" ON public.disputes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── medical_records ─────────────────────────────────────────
CREATE POLICY "patients_view_own_records" ON public.medical_records
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "providers_view_patient_records" ON public.medical_records
  FOR SELECT USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
  );

CREATE POLICY "providers_create_records" ON public.medical_records
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ── hipaa_audit_log ─────────────────────────────────────────
CREATE POLICY "admin_select_hipaa_audit_log" ON public.hipaa_audit_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "service_insert_hipaa_audit_log" ON public.hipaa_audit_log
  FOR INSERT WITH CHECK (public.is_admin());

-- ── insurance_claims ────────────────────────────────────────
CREATE POLICY "patients_view_own_claims" ON public.insurance_claims
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "providers_manage_claims" ON public.insurance_claims
  FOR ALL USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  ) WITH CHECK (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ── patient_consents ────────────────────────────────────────
CREATE POLICY "patients_view_own_consents" ON public.patient_consents
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "patients_manage_own_consents" ON public.patient_consents
  FOR ALL USING (patient_id = public.get_patient_id())
  WITH CHECK (patient_id = public.get_patient_id());

CREATE POLICY "providers_view_patient_consents" ON public.patient_consents
  FOR SELECT USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
  );

-- ── prescriptions ───────────────────────────────────────────
CREATE POLICY "patients_view_own_prescriptions" ON public.prescriptions
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "providers_manage_prescriptions" ON public.prescriptions
  FOR ALL USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  ) WITH CHECK (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ── lab_results ─────────────────────────────────────────────
CREATE POLICY "patients_view_own_lab_results" ON public.lab_results
  FOR SELECT USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "providers_manage_lab_results" ON public.lab_results
  FOR ALL USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  ) WITH CHECK (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ── appointment_waitlist ────────────────────────────────────
CREATE POLICY "patients_manage_own_waitlist" ON public.appointment_waitlist
  FOR ALL USING (patient_id = public.get_patient_id())
  WITH CHECK (patient_id = public.get_patient_id());

CREATE POLICY "providers_view_waitlist" ON public.appointment_waitlist
  FOR SELECT USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

CREATE POLICY "providers_update_waitlist" ON public.appointment_waitlist
  FOR UPDATE USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
  ) WITH CHECK (
    patient_id IN (SELECT public.patient_ids_for_provider())
  );

COMMIT;
