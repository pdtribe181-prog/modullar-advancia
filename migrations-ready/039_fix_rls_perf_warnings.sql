-- ============================================================
-- Migration 039: Fix RLS Performance Warnings
-- ============================================================
-- This migration wraps auth.uid() calls in (select auth.uid())
-- to prevent per-row re-evaluation and improve query performance.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. med_bed_bookings
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.med_bed_bookings;
CREATE POLICY "Users can view their own bookings" ON public.med_bed_bookings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.med_bed_bookings;
CREATE POLICY "Users can create their own bookings" ON public.med_bed_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 2. providers
-- ============================================================
DROP POLICY IF EXISTS "Providers can update own profile" ON public.providers;
CREATE POLICY "Providers can update own profile" ON public.providers
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 3. notifications
-- ============================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 4. webhooks
-- ============================================================
DROP POLICY IF EXISTS "users_manage_own_webhooks" ON public.webhooks;
CREATE POLICY "users_manage_own_webhooks" ON public.webhooks
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 5. user_profiles
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
CREATE POLICY "users_view_own_profile" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

COMMIT;
