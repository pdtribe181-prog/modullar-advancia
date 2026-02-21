-- ============================================================
-- Migration 040: Fix Remaining RLS Performance Warnings
-- ============================================================
-- This migration wraps auth.uid() calls in (select auth.uid())
-- to prevent per-row re-evaluation and improve query performance.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. user_profiles
-- ============================================================
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================================
-- 2. patients
-- ============================================================
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;
CREATE POLICY "patients_view_own" ON public.patients
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
CREATE POLICY "patients_update_own" ON public.patients
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 3. audit_log_exports
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_exports" ON public.audit_log_exports;
CREATE POLICY "users_view_own_exports" ON public.audit_log_exports
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 4. saved_reports
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_reports" ON public.saved_reports;
CREATE POLICY "users_view_own_reports" ON public.saved_reports
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_reports" ON public.saved_reports;
CREATE POLICY "users_manage_own_reports" ON public.saved_reports
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 5. linked_wallets
-- ============================================================
DROP POLICY IF EXISTS "users_manage_own_wallets" ON public.linked_wallets;
CREATE POLICY "users_manage_own_wallets" ON public.linked_wallets
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 6. wallet_verification_challenges
-- ============================================================
DROP POLICY IF EXISTS "users_manage_own_challenges" ON public.wallet_verification_challenges;
CREATE POLICY "users_manage_own_challenges" ON public.wallet_verification_challenges
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 7. wallet_audit_log
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_wallet_audit" ON public.wallet_audit_log;
CREATE POLICY "users_view_own_wallet_audit" ON public.wallet_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 8. notification_queue
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_queue" ON public.notification_queue;
CREATE POLICY "users_view_own_queue" ON public.notification_queue
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 9. security_events
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_security_events" ON public.security_events;
CREATE POLICY "users_view_own_security_events" ON public.security_events
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "system_insert_security_events" ON public.security_events;
CREATE POLICY "system_insert_security_events" ON public.security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR user_id IS NULL
  );

COMMIT;
