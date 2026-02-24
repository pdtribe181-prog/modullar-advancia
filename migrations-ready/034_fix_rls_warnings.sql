-- ============================================================
-- Migration 034: Fix RLS Warnings (Auth RLS Init Plan & Multiple Permissive Policies)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Fix api_keys (Multiple Permissive Policies & Auth RLS Init Plan)
-- Drop all existing overlapping policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_select_own_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_manage_own_api_keys" ON public.api_keys;

-- Create a single consolidated policy for ALL actions
CREATE POLICY "Users can manage own API keys" ON public.api_keys
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 2. Fix appointment_waitlist (Multiple Permissive Policies)
-- Drop all existing overlapping policies
-- ============================================================
DROP POLICY IF EXISTS "patients_manage_own_waitlist" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "providers_view_waitlist" ON public.appointment_waitlist;
DROP POLICY IF EXISTS "providers_update_waitlist" ON public.appointment_waitlist;

-- Create consolidated policies per action to avoid "Multiple Permissive Policies"
-- SELECT
CREATE POLICY "Users can view waitlist" ON public.appointment_waitlist
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR patient_id IN (SELECT public.patient_ids_for_provider())
    OR public.is_admin()
  );

-- INSERT
CREATE POLICY "Patients can insert waitlist" ON public.appointment_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = public.get_patient_id()
  );

-- UPDATE
CREATE POLICY "Users can update waitlist" ON public.appointment_waitlist
  FOR UPDATE
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR patient_id IN (SELECT public.patient_ids_for_provider())
  )
  WITH CHECK (
    patient_id = public.get_patient_id()
    OR patient_id IN (SELECT public.patient_ids_for_provider())
  );

-- DELETE
CREATE POLICY "Patients can delete waitlist" ON public.appointment_waitlist
  FOR DELETE
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
  );

-- ============================================================
-- 3. Fix messages (Auth RLS Init Plan)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = (select auth.uid())
    OR recipient_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Recipients can update messages (mark read)" ON public.messages;
CREATE POLICY "Recipients can update messages (mark read)" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()));

-- ============================================================
-- 4. Fix provider_reviews (Auth RLS Init Plan)
-- ============================================================
DROP POLICY IF EXISTS "Patients can create reviews for completed appointments" ON public.provider_reviews;
CREATE POLICY "Patients can create reviews for completed appointments" ON public.provider_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.appointments
      WHERE id = appointment_id
      AND status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Patients can update own reviews" ON public.provider_reviews;
CREATE POLICY "Patients can update own reviews" ON public.provider_reviews
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Providers can respond to reviews" ON public.provider_reviews;
CREATE POLICY "Providers can respond to reviews" ON public.provider_reviews
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 5. Fix notifications (Auth RLS Init Plan)
-- ============================================================
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL
    OR user_id = (select auth.uid())
    OR public.is_admin()
  );

-- ============================================================
-- 6. Fix webhooks (Auth RLS Init Plan)
-- ============================================================
DROP POLICY IF EXISTS "Users can insert webhooks" ON public.webhooks;
CREATE POLICY "Users can insert webhooks" ON public.webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update webhooks" ON public.webhooks;
CREATE POLICY "Users can update webhooks" ON public.webhooks
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete webhooks" ON public.webhooks;
CREATE POLICY "Users can delete webhooks" ON public.webhooks
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

COMMIT;
