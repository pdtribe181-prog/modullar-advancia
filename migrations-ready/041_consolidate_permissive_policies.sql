-- ============================================================
-- Migration 041: Consolidate Permissive Policies
-- ============================================================
-- This migration consolidates multiple permissive policies on the same table
-- and action into single policies to resolve the "Multiple Permissive Policies"
-- warnings in the Supabase Security Advisor.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. appointments
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_create_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "providers_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "providers_update_appointments" ON public.appointments;

CREATE POLICY "Users can view appointments" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Users can insert appointments" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "Users can update appointments" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  )
  WITH CHECK (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins can delete appointments" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. disputes
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_disputes" ON public.disputes;
DROP POLICY IF EXISTS "patients_create_disputes" ON public.disputes;
DROP POLICY IF EXISTS "users_view_own_disputes" ON public.disputes;

CREATE POLICY "Users can view disputes" ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "Users can insert disputes" ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = public.get_patient_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete disputes" ON public.disputes
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 3. hipaa_audit_log
-- ============================================================
DROP POLICY IF EXISTS "System can insert HIPAA logs" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "service_insert_hipaa_audit_log" ON public.hipaa_audit_log;

CREATE POLICY "System can insert HIPAA logs" ON public.hipaa_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Usually inserted by service role or triggers

-- ============================================================
-- 4. insurance_claims
-- ============================================================
DROP POLICY IF EXISTS "patients_view_own_claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "providers_manage_claims" ON public.insurance_claims;

CREATE POLICY "Users can view insurance claims" ON public.insurance_claims
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Providers can manage insurance claims" ON public.insurance_claims
  FOR ALL
  TO authenticated
  USING (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  )
  WITH CHECK (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  );

-- ============================================================
-- 5. invoices
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_invoices" ON public.invoices;
DROP POLICY IF EXISTS "providers_create_invoices" ON public.invoices;
DROP POLICY IF EXISTS "users_view_own_invoices" ON public.invoices;

CREATE POLICY "Users can view invoices" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Providers can insert invoices" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins can update invoices" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete invoices" ON public.invoices
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 6. lab_results
-- ============================================================
DROP POLICY IF EXISTS "patients_view_own_lab_results" ON public.lab_results;
DROP POLICY IF EXISTS "providers_manage_lab_results" ON public.lab_results;

CREATE POLICY "Users can view lab results" ON public.lab_results
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

CREATE POLICY "Providers can manage lab results" ON public.lab_results
  FOR ALL
  TO authenticated
  USING (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  )
  WITH CHECK (
    patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ============================================================
-- 7. medical_records
-- ============================================================
DROP POLICY IF EXISTS "patients_view_own_records" ON public.medical_records;
DROP POLICY IF EXISTS "providers_view_patient_records" ON public.medical_records;

CREATE POLICY "Users can view medical records" ON public.medical_records
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ============================================================
-- 8. patient_consents
-- ============================================================
DROP POLICY IF EXISTS "patients_manage_own_consents" ON public.patient_consents;
DROP POLICY IF EXISTS "patients_view_own_consents" ON public.patient_consents;
DROP POLICY IF EXISTS "providers_view_patient_consents" ON public.patient_consents;

CREATE POLICY "Users can view patient consents" ON public.patient_consents
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

CREATE POLICY "Patients can manage own consents" ON public.patient_consents
  FOR ALL
  TO authenticated
  USING (patient_id = public.get_patient_id())
  WITH CHECK (patient_id = public.get_patient_id());

-- ============================================================
-- 9. patients
-- ============================================================
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;
DROP POLICY IF EXISTS "providers_view_their_patients" ON public.patients;

CREATE POLICY "Users can view patients" ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- ============================================================
-- 10. prescriptions
-- ============================================================
DROP POLICY IF EXISTS "patients_view_own_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "providers_manage_prescriptions" ON public.prescriptions;

CREATE POLICY "Users can view prescriptions" ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Providers can manage prescriptions" ON public.prescriptions
  FOR ALL
  TO authenticated
  USING (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  )
  WITH CHECK (
    provider_id = public.get_provider_id()
    OR public.is_admin()
  );

-- ============================================================
-- 11. transactions
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions;

CREATE POLICY "Users can view transactions" ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR provider_id = public.get_provider_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins can manage transactions" ON public.transactions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 12. user_profiles
-- ============================================================
DROP POLICY IF EXISTS "admins_update_user_status" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "Users can update user profiles" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (select auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    id = (select auth.uid())
    OR public.is_admin()
  );

COMMIT;
