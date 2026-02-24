-- Migration 033: RLS performance - wrap auth.*() calls with SELECT
-- Supabase performance linter recommends calling auth functions as (select auth.uid())
-- to avoid re-evaluating current_setting()/auth functions for every row.

-- ============================================================
-- MedBed bookings
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.med_bed_bookings;
CREATE POLICY "Users can view their own bookings"
  ON public.med_bed_bookings
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.med_bed_bookings;
CREATE POLICY "Users can create their own bookings"
  ON public.med_bed_bookings
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- Providers
-- ============================================================
DROP POLICY IF EXISTS "Providers can update own profile" ON public.providers;
CREATE POLICY "Providers can update own profile"
  ON public.providers
  FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ============================================================
-- Notifications
-- ============================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ============================================================
-- API keys
-- ============================================================
-- Old policy names (from early RLS migration)
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;

CREATE POLICY "Users can view own API keys" ON public.api_keys
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own API keys" ON public.api_keys
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own API keys" ON public.api_keys
  FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own API keys" ON public.api_keys
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- Newer policy names (from hardened/permissive fixes)
DROP POLICY IF EXISTS "users_select_own_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_manage_own_api_keys" ON public.api_keys;

CREATE POLICY "users_select_own_api_keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_admin());

CREATE POLICY "users_manage_own_api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
