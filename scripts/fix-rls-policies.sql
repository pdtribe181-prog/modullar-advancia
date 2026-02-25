-- ============================================================
-- FIX: Suboptimal auth() calls + consolidate duplicate policies
-- ============================================================

BEGIN;

-- ============================================================
-- 1. api_keys: Drop redundant per-action policies (keep the ALL policy)
-- "Users can manage own API keys" (ALL, authenticated) covers everything
-- "users_manage_own_api_keys" (ALL, authenticated) is identical — drop it
-- Drop per-action policies that overlap with the ALL policy
-- ============================================================

DROP POLICY IF EXISTS "Users can create own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_manage_own_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_select_own_api_keys" ON public.api_keys;

-- Keep only one ALL policy for authenticated, plus admin SELECT
CREATE POLICY "users_manage_own_api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- 2. compliance_logs: Drop duplicate SELECT policies
-- "Admins can view compliance logs" and "admin_select_compliance_logs"
-- are identical — keep one
-- ============================================================

DROP POLICY IF EXISTS "Admins can view compliance logs" ON public.compliance_logs;
DROP POLICY IF EXISTS "admin_select_compliance_logs" ON public.compliance_logs;

CREATE POLICY "admin_select_compliance_logs" ON public.compliance_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- ============================================================
-- 3. med_bed_maintenance: "modifiable by staff" (ALL) overlaps
--    with per-action policies. Drop per-action, keep ALL + viewable
-- ============================================================

DROP POLICY IF EXISTS "Maintenance is deletable by staff" ON public.med_bed_maintenance;
DROP POLICY IF EXISTS "Maintenance is insertable by staff" ON public.med_bed_maintenance;
DROP POLICY IF EXISTS "Maintenance is updatable by staff" ON public.med_bed_maintenance;
DROP POLICY IF EXISTS "Maintenance is modifiable by staff" ON public.med_bed_maintenance;
DROP POLICY IF EXISTS "Maintenance is viewable by authenticated users" ON public.med_bed_maintenance;

-- Staff can do everything
CREATE POLICY "staff_manage_maintenance" ON public.med_bed_maintenance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  );

-- All authenticated can view
CREATE POLICY "authenticated_view_maintenance" ON public.med_bed_maintenance
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 4. med_bed_schedules: same pattern as maintenance
-- ============================================================

DROP POLICY IF EXISTS "Schedules are deletable by staff" ON public.med_bed_schedules;
DROP POLICY IF EXISTS "Schedules are insertable by staff" ON public.med_bed_schedules;
DROP POLICY IF EXISTS "Schedules are updatable by staff" ON public.med_bed_schedules;
DROP POLICY IF EXISTS "Schedules are modifiable by staff" ON public.med_bed_schedules;
DROP POLICY IF EXISTS "Schedules are viewable by authenticated users" ON public.med_bed_schedules;

CREATE POLICY "staff_manage_schedules" ON public.med_bed_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  );

CREATE POLICY "authenticated_view_schedules" ON public.med_bed_schedules
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 5. patients: Drop duplicate SELECT policies, keep one
-- "Users can view patients" and "patients_view_own" overlap
-- ============================================================

DROP POLICY IF EXISTS "Users can view patients" ON public.patients;
DROP POLICY IF EXISTS "patients_view_own" ON public.patients;

-- Consolidated: own patients, provider's patients, or admin
CREATE POLICY "patients_view_policy" ON public.patients
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR id IN (SELECT patient_ids_for_provider())
    OR (SELECT public.is_admin())
  );

-- ============================================================
-- 6. phi_access_log: Drop duplicate SELECT policies
-- "Admins can view PHI access logs" (public, uses auth.uid() bare)
-- "admin_view_phi_access_log" (authenticated, uses is_admin())
-- ============================================================

DROP POLICY IF EXISTS "Admins can view PHI access logs" ON public.phi_access_log;
DROP POLICY IF EXISTS "admin_view_phi_access_log" ON public.phi_access_log;

CREATE POLICY "admin_view_phi_access_log" ON public.phi_access_log
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- ============================================================
-- 7. stripe_webhook_events: Consolidate + fix auth() calls
-- "Admins can view" (public, bare auth.uid())
-- "Service role can manage" (public, bare auth.role())
-- ============================================================

DROP POLICY IF EXISTS "Admins can view stripe webhook events" ON public.stripe_webhook_events;
DROP POLICY IF EXISTS "Service role can manage stripe webhook events" ON public.stripe_webhook_events;

CREATE POLICY "service_role_manage_webhook_events" ON public.stripe_webhook_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_view_webhook_events" ON public.stripe_webhook_events
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- ============================================================
-- 8. user_profiles: Consolidate + fix auth() calls
-- ============================================================

-- SELECT: Drop duplicates
DROP POLICY IF EXISTS "Users can view own decrypted profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;

CREATE POLICY "users_view_own_profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- UPDATE: Drop duplicates (3 policies!)
DROP POLICY IF EXISTS "Admins can update user status" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

COMMIT;
